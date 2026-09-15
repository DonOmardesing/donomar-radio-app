package com.donomar.radio

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var projectionManager: MediaProjectionManager
    private val CAPTURE_CODE = 1001

    companion object {
        var mediaProjectionInstance: MediaProjection? = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager

        val btnStart = findViewById<Button>(R.id.btnStart)

        btnStart.setOnClickListener {
            startActivityForResult(projectionManager.createScreenCaptureIntent(), CAPTURE_CODE)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == CAPTURE_CODE && resultCode == Activity.RESULT_OK && data != null) {
            mediaProjectionInstance = projectionManager.getMediaProjection(resultCode, data)
            
            val intent = Intent(this, StreamService::class.java)
            val etUrl = findViewById<EditText>(R.id.etServerUrl)
            intent.putExtra("SERVER_URL", etUrl.text.toString())
            startForegroundService(intent)
        }
    }
}
