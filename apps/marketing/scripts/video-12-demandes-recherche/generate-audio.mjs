/** Ajoute la voix off française et une musique douce à la vidéo 12. */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..', '..')
const VIDEO_ROOT = path.join(ROOT, 'videos', 'video-12-demandes-recherche')
const FINAL = path.join(VIDEO_ROOT, 'final')
const AUDIO = path.join(VIDEO_ROOT, 'audio')
const VIDEO = path.join(FINAL, 'video-12-demandes-recherche.mp4')
const OUTPUT = path.join(FINAL, 'video-12-demandes-recherche-final.mp4')
const PROJECT = 'location-maison-prod-167da'
const VOICE = 'fr-FR-Studio-A'
fs.mkdirSync(AUDIO, { recursive: true })

function run(command, args, capture = false) {
  return execFileSync(command, args, { stdio: capture ? 'pipe' : 'inherit', encoding: capture ? 'utf8' : undefined })
}

function duration(file) {
  return Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], true).trim())
}

function synthesizeVoice() {
  const token = run('gcloud', ['auth', 'print-access-token'], true).trim()
  const request = path.join(AUDIO, 'voice-request.json')
  const response = path.join(AUDIO, 'voice-response.json')
  const ssml = `<speak>
    Vous avez un logement à louer et vous cherchez un locataire ?
    <break time="300ms"/> Sur Trouve Ton Nkama, découvrez les demandes publiées par des personnes qui cherchent actuellement un bien.
    <break time="350ms"/> Imaginons que votre maison coûte cent quarante mille francs C F A par mois.
    Vous trouvez une demande pour une maison entre zéro et cent cinquante mille francs C F A.
    <break time="300ms"/> Votre bien correspond au budget.
    Il vous suffit d'appuyer sur « Contacter sur WhatsApp » pour échanger directement avec le futur locataire.
    <break time="350ms"/> Plus besoin d'attendre qu'une personne tombe par hasard sur votre annonce.
    Consultez les demandes de recherche sur tonnkama.com.
  </speak>`
  fs.writeFileSync(request, JSON.stringify({
    input: { ssml },
    voice: { languageCode: 'fr-FR', name: VOICE, ssmlGender: 'FEMALE' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.03, pitch: -1, effectsProfileId: ['headphone-class-device'] },
  }))
  run('curl', ['-sS', '-X', 'POST', 'https://texttospeech.googleapis.com/v1/text:synthesize', '-H', `Authorization: Bearer ${token}`, '-H', `x-goog-user-project: ${PROJECT}`, '-H', 'Content-Type: application/json', '--data-binary', `@${request}`, '-o', response])
  const payload = JSON.parse(fs.readFileSync(response, 'utf8'))
  if (!payload.audioContent) throw new Error(payload.error?.message || 'La voix off n’a pas pu être générée.')
  const voice = path.join(AUDIO, 'voiceover.mp3')
  fs.writeFileSync(voice, Buffer.from(payload.audioContent, 'base64'))
  return voice
}

const videoDuration = duration(VIDEO)
const voice = synthesizeVoice()
const voiceDuration = duration(voice)
const voiceDelay = 0.8
const breathingRoom = 1.6
const finalDuration = Math.max(videoDuration, voiceDuration + voiceDelay + breathingRoom)
const extension = Math.max(0, finalDuration - videoDuration)
const music = path.join(AUDIO, 'musique-douce.m4a')

run('ffmpeg', [
  '-y',
  '-f', 'lavfi', '-i', `sine=frequency=196:sample_rate=48000:duration=${finalDuration}`,
  '-f', 'lavfi', '-i', `sine=frequency=247:sample_rate=48000:duration=${finalDuration}`,
  '-f', 'lavfi', '-i', `sine=frequency=294:sample_rate=48000:duration=${finalDuration}`,
  '-filter_complex', `[0:a]volume=0.016[a0];[1:a]volume=0.010[a1];[2:a]volume=0.007[a2];[a0][a1][a2]amix=inputs=3,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, finalDuration - 3)}:d=3[m]`,
  '-map', '[m]', '-c:a', 'aac', '-b:a', '128k', music,
])

run('ffmpeg', [
  '-y', '-i', VIDEO, '-i', voice, '-i', music,
  '-filter_complex', `[0:v]tpad=stop_mode=clone:stop_duration=${extension}[v];[1:a]adelay=800|800,volume=1.35,apad=pad_dur=${finalDuration}[vo];[2:a]volume=0.72[m];[vo][m]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-t', String(finalDuration), '-movflags', '+faststart', OUTPUT,
])

console.log(`Vidéo finale : ${OUTPUT}`)

