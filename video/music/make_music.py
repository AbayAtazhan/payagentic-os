"""Original soundtrack for the ProofPay demo video, synthesized from scratch (no samples, no
third-party music). 120 BPM, A minor, Am-F-C-G. Sections line up with the video's scenes.

Run: python make_music.py out.wav
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
BPM = 120
BEAT = 60 / BPM  # 0.5 s
BAR = 4 * BEAT  # 2 s
LENGTH = 92.0  # seconds
N = int(SR * LENGTH)
rng = np.random.default_rng(7)

# Section map in bars (1 bar = 2 s)
#  0- 4  intro         (0-8s)   pluck arp + hats, filtered
#  4- 5  riser          (8-10s)  build into logo hit at 10s
#  5-21  groove         (10-42s) full beat, bass, pads, arp
# 21-25  breakdown      (42-50s) tension: no kick, dark stabs
# 25-26  riser          (50-52s)
# 26-36  drop           (52-72s) full + lead
# 36-42  groove2        (72-84s)
# 42-46  outro          (84-92s) filter down, final hit


def t_of(bar, beat=0.0):
    return bar * BAR + beat * BEAT


def env_exp(n, decay):
    return np.exp(-np.arange(n) / (SR * decay))


def place(buf, sig, start_s, gain=1.0):
    i = int(start_s * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def lp(sig, cutoff, order=2):
    return sosfilt(butter(order, cutoff, 'low', fs=SR, output='sos'), sig)


def hp(sig, cutoff, order=2):
    return sosfilt(butter(order, cutoff, 'high', fs=SR, output='sos'), sig)


def bp(sig, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), sig)


def note(name):
    names = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave - 4)) / 12)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    return 2 * ((t * f) % 1.0) - 1


# --- Drums --------------------------------------------------------------------------------

def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    freq = 45 + 110 * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * env_exp(n, 0.16)
    click = hp(rng.standard_normal(n), 3000) * env_exp(n, 0.004) * 0.25
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(0.3 * SR)
    noise = bp(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        e[i:] += env_exp(n - i, 0.012 if k < 2 else 0.11)
    return noise * e * 0.9


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    return hp(rng.standard_normal(n), 7500, 4) * env_exp(n, 0.07 if open_ else 0.014) * 0.5


def snare_roll(start, bars=1):
    out = []
    steps = 16 * bars
    for k in range(steps):
        frac = k / steps
        div = 4 if frac < 0.5 else 8 if frac < 0.75 else 16
        if (k % (16 // div)) == 0:
            out.append((start + k * BEAT / 4, 0.25 + 0.75 * frac))
    return out


# --- Tonal ---------------------------------------------------------------------------------

CHORDS = [  # Am F C G
    ('A2', ['A3', 'C4', 'E4']),
    ('F2', ['F3', 'A3', 'C4']),
    ('C3', ['G3', 'C4', 'E4']),
    ('G2', ['G3', 'B3', 'D4']),
]


def chord_at(bar):
    return CHORDS[int(bar) % 4]


def pad(freqs, dur, cutoff):
    n = int(dur * SR)
    sig = np.zeros(n)
    for f in freqs:
        for d in (-0.006, 0, 0.006):
            sig += saw(f, n, d)
    sig /= len(freqs) * 3
    a = np.minimum(1, np.arange(n) / (0.04 * SR))
    r = np.minimum(1, (n - np.arange(n)) / (0.15 * SR))
    return lp(sig, cutoff) * a * r


def pluck(freq, dur=0.22, bright=4000):
    n = int(dur * SR)
    sig = 0.6 * saw(freq, n) + 0.4 * np.sin(2 * np.pi * freq * np.arange(n) / SR)
    return lp(sig, bright) * env_exp(n, 0.07)


def bass_note(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = 0.7 * np.sin(2 * np.pi * freq * t) + 0.3 * np.tanh(3 * np.sin(2 * np.pi * freq * t))
    a = np.minimum(1, np.arange(n) / (0.005 * SR))
    r = np.minimum(1, (n - np.arange(n)) / (0.03 * SR))
    return lp(sig, 900) * a * r


def lead(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.2)
    phase = np.cumsum(freq * vib) / SR
    sig = (2 * (phase % 1) - 1) * 0.5 + np.sign(np.sin(2 * np.pi * phase)) * 0.25
    a = np.minimum(1, np.arange(n) / (0.01 * SR))
    r = np.minimum(1, (n - np.arange(n)) / (0.06 * SR))
    return lp(sig, 3200) * a * r


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    seg = int(0.05 * SR)
    for i in range(0, n, seg):
        frac = i / n
        lo = 300 + 6000 * frac ** 2
        out[i : i + seg] = bp(noise[i : i + seg + 0], lo, min(lo * 2.2, 18000))[: len(out[i : i + seg])]
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / dur) ** 2) / SR) * 0.25
    return (out * 0.6 + sweep) * (t / dur) ** 1.5


def impact():
    n = int(2.5 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 6)) / SR) * env_exp(n, 0.6)
    crash = hp(rng.standard_normal(n), 4000) * env_exp(n, 0.8) * 0.35
    return np.tanh(boom * 1.4) + crash


def ping(freq):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)) * env_exp(n, 0.18)


# --- Arrange -------------------------------------------------------------------------------

drums = np.zeros(N)
bass = np.zeros(N)
pads = np.zeros(N)
arp = np.zeros(N)
leads = np.zeros(N)
fx = np.zeros(N)
sidechain = np.ones(N)

K, C, H, HO = kick(), clap(), hat(), hat(True)


def in_section(bar, *ranges):
    return any(a <= bar < b for a, b in ranges)


FULL = [(5, 21), (26, 42)]
for bar in range(46):
    bass_root, triad = chord_at(bar)
    freqs = [note(x) for x in triad]
    for beat in range(4):
        t0 = t_of(bar, beat)
        if in_section(bar, *FULL):
            place(drums, K, t0, 1.0)
            dip = 1 - 0.65 * np.exp(-np.arange(int(0.35 * SR)) / (SR * 0.09))
            i = int(t0 * SR)
            j = min(N, i + len(dip))
            sidechain[i:j] = np.minimum(sidechain[i:j], dip[: j - i])
            if beat in (1, 3):
                place(drums, C, t0, 0.8)
            place(drums, HO, t0 + BEAT / 2, 0.35)
            for s in (1, 3):
                place(drums, H, t0 + s * BEAT / 4, 0.25)
        elif in_section(bar, (0, 4), (42, 44)):
            place(drums, H, t0 + BEAT / 2, 0.3)
            if bar >= 2 and beat == 3:
                place(drums, C, t0, 0.35)
        elif in_section(bar, (21, 25)):
            if beat == 0:
                place(drums, K, t0, 0.55)  # heartbeat
                place(drums, K, t0 + 0.28, 0.35)

    # bass: 8ths in full sections, long notes in breakdown
    if in_section(bar, *FULL):
        for e in range(8):
            octave = 2 if e % 2 else 1
            f = note(bass_root) * (2 if octave == 2 else 1)
            place(bass, bass_note(f, BEAT / 2 * 0.9), t_of(bar, e / 2), 0.55)
    elif in_section(bar, (21, 25)):
        place(bass, bass_note(note(bass_root) / 2, BAR * 0.95), t_of(bar), 0.5)

    # pads
    cutoff = 1200 if in_section(bar, (0, 5), (21, 26), (42, 46)) else 3500
    if not in_section(bar, (4, 5), (25, 26)):
        place(pads, pad(freqs, BAR, cutoff), t_of(bar), 0.32)

    # arp: 16ths chord tones
    if not in_section(bar, (21, 25)):
        pattern = [0, 1, 2, 1, 2, 0, 1, 2] * 2
        bright = 1800 if bar < 4 else 4500
        for s, idx in enumerate(pattern):
            f = freqs[idx] * (2 if s % 4 == 2 else 1)
            place(arp, pluck(f, bright=bright), t_of(bar, s / 4), 0.22 if bar < 26 else 0.17)
    else:
        # breakdown: dark stabs on 1 and the "and" of 2
        for b in (0, 1.5):
            place(arp, pluck(freqs[0] / 2, 0.5, 900), t_of(bar, b), 0.4)

# Lead melody in the drop (bars 26-36): two 4-bar phrases + tag
MELODY = [
    ('E5', 0, 1), ('C5', 1, 0.5), ('D5', 1.5, 0.5), ('E5', 2, 1.5),
    ('F5', 4, 1), ('E5', 5, 0.5), ('C5', 5.5, 0.5), ('A4', 6, 1.5),
    ('G5', 8, 1), ('E5', 9, 0.5), ('G5', 9.5, 0.5), ('E5', 10, 1.5),
    ('D5', 12, 1), ('B4', 13, 0.5), ('D5', 13.5, 0.5), ('G5', 14, 1.5),
]
for phrase in (26, 30, 34):
    for name, beat_off, dur in MELODY:
        start = t_of(phrase) + beat_off * BEAT
        if start < t_of(36):
            place(leads, lead(note(name), dur * BEAT * 0.95), start, 0.28)

# FX: risers, impacts, notification pings at key story beats (seconds)
place(fx, riser(BAR), t_of(4), 0.7)
for s, g in snare_roll(t_of(4)):
    place(fx, C, s, 0.5 * g)
place(fx, impact(), t_of(5), 0.9)  # logo at 10s
place(fx, riser(BAR), t_of(25), 0.8)
for s, g in snare_roll(t_of(25)):
    place(fx, C, s, 0.55 * g)
place(fx, impact(), t_of(26), 1.0)  # drop at 52s: payment released
place(fx, impact(), t_of(44), 0.7)  # final logo at 88s
for sec in (30.0, 59.0, 76.0):  # money-moment pings
    place(fx, ping(note('E6')), sec, 0.25)
    place(fx, ping(note('A6')), sec + 0.12, 0.2)

mix = drums * 0.9 + (bass * 0.9 + pads + arp + leads) * sidechain + fx * 0.8

# Outro fade over the last 4 seconds
fade = np.ones(N)
fade[-int(4 * SR):] = np.linspace(1, 0, int(4 * SR)) ** 1.5
mix *= fade
mix = hp(mix, 30)

# Gentle soft-clip master, then -1 dBFS peak (final loudness is set with ffmpeg loudnorm)
mix /= np.max(np.abs(mix))
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix *= 10 ** (-1 / 20)

stereo = np.stack([mix, np.roll(mix, int(0.008 * SR)) * 0.96 + mix * 0.04], axis=1)
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else 'proofpay-theme.wav', SR, (stereo * 32767).astype(np.int16))
print('ok', LENGTH, 's')
