const { createApp, ref, computed, onBeforeUnmount } = Vue;

const API_BASE = window.location.origin;

createApp({
  setup() {
    // ── State ──────────────────────────────────────────────
    const selectedFile = ref(null);
    const imagePreview = ref(null);
    const targetLanguage = ref("Tamil");
    const loading = ref(false);
    const error = ref(null);
    const translatedText = ref("");
    const audioUrl = ref(null);
    const audioPlayer = ref(null);
    const isPlaying = ref(false);
    const progress = ref(0);
    const currentTime = ref(0);
    const duration = ref(0);
    const isDragging = ref(false);
    const copied = ref(false);
    const showImageModal = ref(false);

    // Languages list — keys match LanguageMap.py
    const languages = {
      "Assamese": "Assamese",
      "Bengali": "Bengali",
      "Bodo": "Bodo",
      "Dogri": "Dogri",
      "Hindi": "Hindi",
      "Kannada": "Kannada",
      "Maithili": "Maithili",
      "Malayalam": "Malayalam",
      "Marathi": "Marathi",
      "Nepali": "Nepali",
      "Punjabi": "Punjabi",
      "Sanskrit": "Sanskrit",
      "Tamil": "Tamil",
      "Telugu": "Telugu",
    };

    // ── File handling ──────────────────────────────────────
    function onFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      setFile(file);
    }

    function setFile(file) {
      if (!file.type.startsWith("image/")) {
        error.value = "Please select a valid image file (PNG, JPG, JPEG, WEBP).";
        return;
      }
      selectedFile.value = file;
      error.value = null;

      const reader = new FileReader();
      reader.onload = (ev) => {
        imagePreview.value = ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    function clearImage() {
      selectedFile.value = null;
      imagePreview.value = null;
      error.value = null;
      showImageModal.value = false;
    }

    // ── Drag & Drop ────────────────────────────────────────
    function onDragOver() {
      isDragging.value = true;
    }

    function onDragLeave() {
      isDragging.value = false;
    }

    function onDrop(e) {
      isDragging.value = false;
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        setFile(file);
      } else {
        error.value = "Please drop an image file.";
      }
    }

    // ── Send to backend ────────────────────────────────────
    async function send() {
      if (!selectedFile.value) return;

      // Unlock and prime audio in user gesture context
      const player = audioPlayer.value;
      if (player) {
        player.pause();
        player.currentTime = 0;
      }

      loading.value = true;
      error.value = null;
      translatedText.value = "";

      // Revoke previous audio blob URL
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
        audioUrl.value = null;
      }
      isPlaying.value = false;
      progress.value = 0;
      currentTime.value = 0;
      duration.value = 0;

      const formData = new FormData();
      formData.append("Input", selectedFile.value);
      formData.append("TargetLanguage", targetLanguage.value);

      try {
        const resp = await fetch(`${API_BASE}/TTIS`, {
          method: "POST",
          body: formData,
        });

        if (!resp.ok) {
          let errMsg = `Server error (${resp.status})`;
          try {
            const errJson = await resp.json();
            errMsg = errJson.detail || errMsg;
          } catch (_) {}
          throw new Error(errMsg);
        }

        // Parse custom binary protocol:
        // [4 bytes text len][4 bytes audio len][text bytes][audio bytes]
        const buffer = await resp.arrayBuffer();
        const view = new DataView(buffer);

        const textLen = view.getUint32(0, false);
        const audioLen = view.getUint32(4, false);

        // Extract translated text
        const textBytes = new Uint8Array(buffer, 8, textLen);
        const decoder = new TextDecoder("utf-8");
        translatedText.value = decoder.decode(textBytes);

        // Extract audio with clean buffer slice
        const audioBuffer = buffer.slice(8 + textLen, 8 + textLen + audioLen);
        const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });
        const newUrl = URL.createObjectURL(audioBlob);
        audioUrl.value = newUrl;

        // Auto-play the synthesized speech automatically
        setTimeout(async () => {
          try {
            const p = audioPlayer.value;
            if (p) {
              p.src = newUrl;
              p.load();
              await p.play();
              isPlaying.value = true;
            }
          } catch (autoplayErr) {
            console.warn("Direct player autoplay blocked, trying standalone audio fallback:", autoplayErr);
            try {
              const fallback = new Audio(newUrl);
              await fallback.play();
              isPlaying.value = true;
            } catch (e2) {
              console.error("Audio playback could not be started automatically:", e2);
            }
          }
        }, 80);
      } catch (e) {
        error.value = e.message || "Failed to process image. Please try again.";
      } finally {
        loading.value = false;
      }
    }

    // ── Audio controls ─────────────────────────────────────
    function toggleAudio() {
      const player = audioPlayer.value;
      if (!player) {
        console.error("Audio player element not ready");
        return;
      }
      if (!audioUrl.value) {
        console.warn("No audio URL available to play");
        return;
      }

      if (player.paused) {
        player.play().then(() => {
          isPlaying.value = true;
        }).catch(e => {
          console.error("Audio playback error:", e);
          isPlaying.value = false;
        });
      } else {
        player.pause();
        isPlaying.value = false;
      }
    }

    function onTimeUpdate() {
      const player = audioPlayer.value;
      if (!player || !player.duration || isNaN(player.duration)) return;
      currentTime.value = player.currentTime;
      progress.value = (player.currentTime / player.duration) * 100;
    }

    function onLoaded() {
      const player = audioPlayer.value;
      if (player && player.duration && !isNaN(player.duration) && isFinite(player.duration)) {
        duration.value = player.duration;
      }
    }

    function onEnded() {
      isPlaying.value = false;
      progress.value = 0;
      currentTime.value = 0;
    }

    function onAudioError(e) {
      console.error("HTMLAudioElement encountered an error:", e);
      isPlaying.value = false;
    }

    function seek(e) {
      const player = audioPlayer.value;
      if (!player || !player.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      player.currentTime = ratio * player.duration;
    }

    function formatTime(secs) {
      if (!secs || isNaN(secs) || !isFinite(secs)) return "0:00";
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
    }

    // ── Copy text ──────────────────────────────────────────
    async function copyTranslation() {
      if (!translatedText.value) return;
      try {
        await navigator.clipboard.writeText(translatedText.value);
        copied.value = true;
        setTimeout(() => {
          copied.value = false;
        }, 2000);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }

    // Cleanup blob URL on unmount
    onBeforeUnmount(() => {
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
      }
    });

    return {
      selectedFile,
      imagePreview,
      targetLanguage,
      loading,
      error,
      translatedText,
      audioUrl,
      audioPlayer,
      isPlaying,
      progress,
      currentTime,
      duration,
      isDragging,
      copied,
      showImageModal,
      languages,
      onFileSelect,
      clearImage,
      send,
      toggleAudio,
      onTimeUpdate,
      onLoaded,
      onEnded,
      onAudioError,
      seek,
      formatTime,
      copyTranslation,
      onDragOver,
      onDragLeave,
      onDrop,
    };
  },
}).mount("#app");
