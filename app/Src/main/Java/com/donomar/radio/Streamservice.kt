package com.donomar.radio

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.IBinder
import androidx.core.app.NotificationCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString

class StreamService : Service() {
    private var isStreaming = false
    private var webSocket: WebSocket? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val serverUrl = intent?.getStringExtra("SERVER_URL") ?: return START_NOT_STICKY
        
        val channelId = "donomar_stream"
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(channelId, "Radio Stream", NotificationManager.IMPORTANCE_LOW)
        manager.createNotificationChannel(channel)
        
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Don Omar Radio")
            .setContentText("Transmitiendo en vivo...")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .build()

        startForeground(1, notification)

        val client = OkHttpClient()
        val request = Request.Builder().url(serverUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                ws.send("BROADCASTER_CONNECT")
                iniciarCapturaAudio()
            }
        })

        return START_STICKY
    }

    private fun iniciarCapturaAudio() {
        val sampleRate = 44100
        val bufferSize = AudioRecord.getMinBufferSize(
            sampleRate, 
            AudioFormat.CHANNEL_IN_STEREO, 
            AudioFormat.ENCODING_PCM_16BIT
        )

        val projection = MainActivity.mediaProjectionInstance ?: return
        val config = AudioPlaybackCaptureConfiguration.Builder(projection)
            .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
            .addMatchingUsage(AudioAttributes.USAGE_GAME)
            .build()

        val internalRecord = AudioRecord.Builder()
            .setAudioPlaybackCaptureConfig(config)
            .setAudioFormat(AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_IN_STEREO)
                .build())
            .setBufferSizeInBytes(bufferSize)
            .build()

        val micRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            AudioFormat.CHANNEL_IN_STEREO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize
        )

        internalRecord.startRecording()
        micRecord.startRecording()
        isStreaming = true

        Thread {
            val internalBuf = ByteArray(bufferSize)
            val micBuf = ByteArray(bufferSize)
            val mixedBuf = ByteArray(bufferSize)

            while (isStreaming) {
                internalRecord.read(internalBuf, 0, bufferSize)
                micRecord.read(micBuf, 0, bufferSize)

                for (i in 0 until bufferSize step 2) {
                    val sInternal = (internalBuf[i+1].toInt() shl 8) or (internalBuf[i].toInt() and 0xFF)
                    val sMic = (micBuf[i+1].toInt() shl 8) or (micBuf[i].toInt() and 0xFF)
                    
                    var mixed = sInternal + sMic
                    if (mixed > 32767) mixed = 32767
                    if (mixed < -32768) mixed = -32768

                    mixedBuf[i] = (mixed and 0xFF).toByte()
                    mixedBuf[i+1] = ((mixed shr 8) and 0xFF).toByte()
                }

                webSocket?.send(mixedBuf.toByteString(0, bufferSize))
            }
            internalRecord.stop()
            micRecord.stop()
        }.start()
    }

    override fun onDestroy() {
        isStreaming = false
        webSocket?.close(1000, "Cerrado")
        super.onDestroy()
    }
}
