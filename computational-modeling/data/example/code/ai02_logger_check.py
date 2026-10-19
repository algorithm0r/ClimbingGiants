"""Assignment 2: what a slower logger would read from crash test 10642.

Run it from a folder with crash/10642.json in it (the test is on the site at
data/example/10642.json).

Keeps every k-th sample of the 12,500 Hz record, tries every start from 0 to k-1,
and reports the lowest peak (the worst start) as a share of the recorded peak.
1 kHz is not a whole step down from 12,500 Hz (12.5 samples), so it is bracketed
by k = 12 (1,041.7 Hz) and k = 13 (961.5 Hz).
"""
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

G = 9.81
KEEP = 0.95
with open('crash/10642.json') as f:
    channels = json.load(f)['channels']

rate = round(1 / channels['head_x']['dt'])
factors = [1, 2, 3, 4, 5, 10, 12, 13, 20, 25, 50]

def values(key):
    y = channels[key]['y']
    return [v / 1000 for v in y] if key == 'chest_d' else [v / G for v in y]   # chest_d: micrometres to mm

def peak(y):
    return max(abs(v) for v in y)

def peaks_by_start(y, k):
    return [peak(y[s::k]) for s in range(k)]

print(f'recorded rate {rate} Hz')
worst = {}
for key, ch in channels.items():
    y = values(key)
    full = peak(y)
    i = max(range(len(y)), key=lambda j: abs(y[j]))
    worst[key] = [min(peaks_by_start(y, k)) / full for k in factors]
    print(f"{key:12} peak {full:8.2f} at {1000 * (ch['t0'] + i * ch['dt']):6.1f} ms  "
          + ' '.join(f'{rate / k:7.1f}:{100 * w:5.1f}' for k, w in zip(factors, worst[key])))

for name, keys in (('every channel', list(channels)), ('dummy only', [k for k in channels if k != 'vehicle_x'])):
    ok = [rate / k for i, k in enumerate(factors) if all(worst[c][i] >= KEEP for c in keys)]
    print(f'{name}: lowest passing rate {min(ok):.1f} Hz')

y = values('vehicle_x')
for k in (12, 13):
    p = peaks_by_start(y, k)
    print(f'crossmember at k={k}: {min(p):.1f} to {max(p):.1f} g')

rates = [rate / k for k in factors]
plt.figure(figsize=(7.5, 4.5))
for key, ch in channels.items():
    fmt, style = ('s--', dict(color='gray', linewidth=2)) if key == 'vehicle_x' else ('o-', {})
    plt.semilogx(rates, [100 * w for w in worst[key]], fmt, ms=3, label=ch['comment'].title(), **style)
plt.axhline(95, color='black', linestyle=':', linewidth=0.8, label='95% of the peak')
plt.axvline(1000, color='red', linewidth=0.8, label='proposed logger, 1,000 Hz')
plt.xticks([250, 500, 1000, 2500, 4167, 6250, 12500], ['250', '500', '1000', '2500', '4167', '6250', '12500'])
plt.xlabel('sample rate (samples a second, log scale)')
plt.ylabel('worst-start peak (% of the 12,500 Hz peak)')
plt.title('Peak kept at each rate, worst start, test 10642', fontsize=10)
plt.legend(fontsize=7, loc='lower right')
plt.tight_layout()
plt.savefig('fig1_worst_peak_vs_rate.png', dpi=130)
