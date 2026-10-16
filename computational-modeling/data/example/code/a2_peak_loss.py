"""Assignment 2: peak loss at lower sample rates, every channel of test 9793.

Run this from the unzipped pack folder. A record at a lower rate is made from
the 20 kHz one by keeping every k-th sample. Which sample the slower logger
starts on is not known, so every start from 0 to k-1 is tried and the lowest
peak (the worst start) and highest peak (the best start) are both kept.

Prints the 20 kHz peak of each channel, the worst-start peak at each rate, and
the lowest rate at which every channel keeps 95% of its peak. Saves
fraction_vs_rate.svg (Figure 1) and crossmember_1khz.svg (Figure 2).
"""
import json

import matplotlib.pyplot as plt

G = 9.81                 # m/s^2 in one g
KEEP = 0.95              # a rate passes if every channel keeps 95% of its peak
PROPOSED = 1000          # Hz, the logger purchasing wants

with open('crash/09793.json') as f:
    test = json.load(f)
channels = test['channels']

rate_now = round(1 / channels['head_x']['dt'])
# every whole-number step down from 20 kHz, to 200 Hz
factors = [k for k in range(1, 101) if rate_now % k == 0]
rates = [rate_now // k for k in factors]


def values(key):
    """The channel in g, or in mm for the chest displacement.
    Its header says m, but the values are micrometers (see Errors)."""
    ch = channels[key]
    if key == 'chest_d':
        return [v / 1000 for v in ch['y']], 'mm'
    return [v / G for v in ch['y']], 'g'


def peak(y):
    return max(abs(v) for v in y)


def peaks_by_start(y, k):
    """Peak of the record that keeps every k-th sample, for each start 0..k-1."""
    return [peak(y[start::k]) for start in range(k)]


v, info = test['vehicle'], test['test']
print(f"Test {test['testNo']}: {v['year']} {v['make']} {v['model']}, "
      f"{info['config']} at {info['speed_kph']} km/h")
print("samples, spacing (s) and prefilter (Hz) of each channel:",
      {(ch['n'], ch['dt'], ch['prefilter_hz']) for ch in channels.values()})
print(f"recorded rate {rate_now} Hz, {len(rates)} rates tried, {rates[0]} to {rates[-1]} Hz")
print()

# the 20 kHz peak of every channel, and when it happens
print(f"{'key':12} {'description':34} {'peak':>8} {'unit':4} {'at (ms)':>8}")
for key, ch in channels.items():
    y, unit = values(key)
    i = max(range(len(y)), key=lambda j: abs(y[j]))
    t_ms = 1000 * (ch['t0'] + i * ch['dt'])
    print(f"{key:12} {ch['comment']:34} {peak(y):8.2f} {unit:4} {t_ms:8.2f}")

# worst-start peak at each rate, as a fraction of the 20 kHz peak
worst = {}
for key in channels:
    y, unit = values(key)
    full = peak(y)
    worst[key] = [min(peaks_by_start(y, k)) / full for k in factors]

print(f"\nworst-start peak as % of the 20 kHz peak")
print(f"{'rate (Hz)':>9} " + ' '.join(f"{key:>11}" for key in channels))
for i, r in enumerate(rates):
    print(f"{r:9d} " + ' '.join(f"{100 * worst[key][i]:11.1f}" for key in channels))

# the lowest rate that every channel passes, with every faster rate passing too
lowest = rate_now
for i, r in enumerate(rates):
    if all(worst[key][i] >= KEEP for key in channels):
        lowest = r
    else:
        failing = [key for key in channels if worst[key][i] < KEEP]
        print(f"\n{r} Hz is the first rate to fail: {', '.join(failing)}")
        break
print(f"Lowest rate keeping {100 * KEEP:.0f}% of every peak: {lowest} Hz")

# the proposed rate, worst and best start, in the channel's own units
k = rate_now // PROPOSED
print(f"\nAt {PROPOSED} Hz (every {k}th sample), range of peaks over the {k} starts:")
for key in channels:
    y, unit = values(key)
    p = peaks_by_start(y, k)
    print(f"  {key:12} 20 kHz {peak(y):7.2f}   worst {min(p):7.2f} ({100 * min(p) / peak(y):5.1f}%)"
          f"   best {max(p):7.2f}   start 0 {p[0]:7.2f} {unit}")

# Figure 1: worst-start fraction against rate, one line per channel
plt.figure(figsize=(7.5, 4.5))
for key, ch in channels.items():
    plt.semilogx(rates, [100 * w for w in worst[key]], '.-', label=ch['comment'].title())
plt.axhline(100 * KEEP, color='black', linestyle=':', linewidth=0.8, label='95% of the peak')
plt.axvline(PROPOSED, color='red', linewidth=0.8, label='proposed logger, 1000 Hz')
plt.xticks([200, 500, 1000, 2000, 5000, 10000, 20000],
           ['200', '500', '1000', '2000', '5000', '10000', '20000'])
plt.xlabel('sample rate (Hz, log scale)')
plt.ylabel('worst-start peak (% of the 20 kHz peak)')
plt.title('Peak kept at each rate, worst start, test 9793', fontsize=10)
plt.legend(fontsize=7, loc='lower right')
plt.tight_layout()
plt.savefig('fraction_vs_rate.svg')
plt.close()

# Figure 2: the crossmember around its peak, and what a 1 kHz logger keeps of it
ch = channels['vehicle_x']
y, unit = values('vehicle_x')
t_ms = [1000 * (ch['t0'] + i * ch['dt']) for i in range(ch['n'])]
p = peaks_by_start(y, k)
best_start, worst_start = p.index(max(p)), p.index(min(p))
plt.figure(figsize=(7.5, 4))
win = [i for i in range(ch['n']) if 40 <= t_ms[i] <= 70]
plt.plot([t_ms[i] for i in win], [y[i] for i in win], color='gray', linewidth=0.8,
         label='recorded at 20000 Hz')
for start, mark, name in ((best_start, 'o', 'best'), (worst_start, 's', 'worst')):
    kept = [i for i in win if (i - start) % k == 0]
    plt.plot([t_ms[i] for i in kept], [y[i] for i in kept], mark + '-',
             label=f'1000 Hz, {name} start (sample {start})')
plt.xlabel('time from impact (ms)')
plt.ylabel('acceleration (g)')
plt.title(ch['comment'].title() + ' [' + ch['code'] + '], 40 to 70 ms',
          fontsize=10)
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('crossmember_1khz.svg')
