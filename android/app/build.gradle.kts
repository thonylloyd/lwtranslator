plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.loveworld.lwtranslator"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.loveworld.lwtranslator"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        // Where the shell loads the PWA from. At a venue the local server hosts
        // the app itself, so discovery normally overrides this at runtime.
        buildConfigField("String", "DEFAULT_APP_URL", "\"https://lw-translator.local:8443/\"")
        buildConfigField("int", "SERVER_PORT", "8787")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.media:media:1.7.0")
}
