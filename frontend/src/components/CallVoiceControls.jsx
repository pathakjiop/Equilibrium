import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

export default function CallVoiceControls({ voice, disabled }) {
  return (
    <div className="call-voice-controls" aria-label="Call audio controls">
      <button type="button" className="btn-app-sm" onClick={voice.toggleVoice}
        aria-pressed={voice.voiceEnabled} title="Toggle caller audio">
        {voice.voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        <span>{voice.voiceEnabled ? 'Caller audio on' : 'Caller audio off'}</span>
      </button>
      <button type="button" className="btn-app-sm" onClick={voice.toggleListening}
        disabled={disabled || !voice.inputAvailable} aria-pressed={voice.listening} title="Dictate your reply">
        {voice.listening ? <MicOff size={15} /> : <Mic size={15} />}
        <span>{voice.listening ? 'Stop listening' : 'Use microphone'}</span>
      </button>
      {voice.listening && <span className="call-voice-recording" role="status">
        {voice.interimTranscript || 'Listening… Speak your reply.'}
      </span>}
      {voice.error && <span className="call-voice-error" role="status">{voice.error}</span>}
    </div>
  );
}
