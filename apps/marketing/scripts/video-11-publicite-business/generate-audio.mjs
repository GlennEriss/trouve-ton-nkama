/** Ajoute une voix off française et une musique douce à la vidéo 11. */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(HERE, '..', '..')
const VIDEO_ROOT = path.join(ROOT, 'videos', 'video-11-publicite-business')
const FINAL = path.join(VIDEO_ROOT, 'final')
const AUDIO = path.join(VIDEO_ROOT, 'audio')
const VIDEO = path.join(FINAL, 'video-11-publicite-business.mp4')
const OUTPUT = path.join(FINAL, 'video-11-publicite-business-final.mp4')
const PROJECT = 'location-maison-prod-167da'
const VOICE = 'fr-FR-Studio-A'
fs.mkdirSync(AUDIO, { recursive: true })

function run(command, args, options = {}) {
  return execFileSync(command, args, { stdio: options.capture ? 'pipe' : 'inherit', encoding: options.capture ? 'utf8' : undefined })
}

function duration(file) {
  return Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { capture: true }).trim())
}

function synthesizeVoice() {
  const token = run('gcloud', ['auth', 'print-access-token'], { capture: true }).trim()
  const request = path.join(AUDIO, 'voice-request.json')
  const response = path.join(AUDIO, 'voice-response.json')
  const ssml = `<speak>
    Vous avez un commerce, un service ou une activité au Gabon ?
    <break time="300ms"/> Votre prochain client est peut-être déjà sur Trouve Ton Nkama.
    <break time="350ms"/> Faites connaître votre offre auprès d'un public local, avec des tarifs accessibles à partir de trois mille sept cent cinquante francs C F A.
    <break time="350ms"/> Depuis l'espace Publicités, choisissez votre formule et vos emplacements.
    Pour apparaître dans les Réels, sélectionnez le forfait Réels, puis ajoutez une image ou une vidéo verticale.
    <break time="350ms"/> Ajoutez une accroche claire et votre lien WhatsApp.
    Avant de publier, voyez exactement comment votre publicité apparaîtra.
    <break time="400ms"/> Prêt à développer votre visibilité au Gabon ? Créez votre publicité maintenant sur tonnkama.com.
  </speak>`
  fs.writeFileSync(request, JSON.stringify({
    input: { ssml },
    voice: { languageCode: 'fr-FR', name: VOICE, ssmlGender: 'FEMALE' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.04, pitch: -1, effectsProfileId: ['headphone-class-device'] },
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
const voiceDelaySeconds = 0.9
const finalBreathingRoomSeconds = 1.5
const finalDuration = Math.max(videoDuration, voiceDuration + voiceDelaySeconds + finalBreathingRoomSeconds)
const videoExtension = Math.max(0, finalDuration - videoDuration)
const music = path.join(AUDIO, 'musique-douce.m4a')
run('ffmpeg', [
  '-y',
  '-f', 'lavfi', '-i', `sine=frequency=196:sample_rate=48000:duration=${finalDuration}`,
  '-f', 'lavfi', '-i', `sine=frequency=247:sample_rate=48000:duration=${finalDuration}`,
  '-f', 'lavfi', '-i', `sine=frequency=294:sample_rate=48000:duration=${finalDuration}`,
  '-filter_complex', `[0:a]volume=0.018[a0];[1:a]volume=0.012[a1];[2:a]volume=0.009[a2];[a0][a1][a2]amix=inputs=3,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, finalDuration - 3)}:d=3[m]`,
  '-map', '[m]', '-c:a', 'aac', '-b:a', '128k', music,
])
run('ffmpeg', [
  '-y', '-i', VIDEO, '-i', voice, '-i', music,
  '-filter_complex', `[0:v]tpad=stop_mode=clone:stop_duration=${videoExtension}[v];[1:a]adelay=900|900,volume=1.35,apad=pad_dur=${finalDuration}[vo];[2:a]volume=0.75[m];[vo][m]amix=inputs=2:duration=longest:dropout_transition=2,alimiter=limit=0.95[a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', String(finalDuration), '-movflags', '+faststart', OUTPUT,
])
console.log(`Vidéo finale avec voix complète et ${finalBreathingRoomSeconds}s de respiration : ${OUTPUT}`)
