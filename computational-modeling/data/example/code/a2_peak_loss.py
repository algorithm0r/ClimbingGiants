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
factors = []
for k in range(1, 101):
    if rate_now % k == 0:              # k divides the rate exactly
        factors.append(k)
rates = []
for k in factors:
    rates.append(rate_now // k)


def values(key):
    """The channel in g, or in mm for the chest displacement.
    Its header says m, but the values are micrometers (see Errors)."""
    ch = channels[key]
    out = []
    if key == 'chest_d':
        for v in ch['y']:
            out.append(v / 1000)
        return out, 'mm'
    for v in ch['y']:
        out.append(v / G)
    return out, 'g'


def peak(y):
    """The largest size in y, ignoring sign."""
    biggest = abs(y[0])
    for v in y:
        if abs(v) > biggest:
            biggest = abs(v)
    return biggest


def peaks_by_start(y, k):
    """Peak of the record that keeps every k-th sample, for each start 0..k-1."""
    peaks = []
    for start in range(k):
        peaks.append(peak(y[start::k]))
    return peaks


v = test['vehicle']
info = test['test']
print(f"Test {test['testNo']}: {v['year']} {v['make']} {v['model']}, "
      f"{info['config']} at {info['speed_kph']} km/h")
timings = set()          # a set keeps each different combination once
for ch in channels.values():
    timings.add((ch['n'], ch['dt'], ch['prefilter_hz']))
print("samples, spacing (s) and prefilter (Hz) of each channel:", timings)
print(f"recorded rate {rate_now} Hz, {len(rates)} rates tried, {rates[0]} to {rates[-1]} Hz")
print()

# the 20 kHz peak of every channel, and when it happens
print(f"{'key':12} {'description':34} {'peak':>8} {'unit':4} {'at (ms)':>8}")
for key, ch in channels.items():
    y, unit = values(key)
    i = 0                                # index of the largest size so far
    for j in range(len(y)):
        if abs(y[j]) > abs(y[i]):
            i = j
    t_ms = 1000 * (ch['t0'] + i * ch['dt'])
    print(f"{key:12} {ch['comment']:34} {peak(y):8.2f} {unit:4} {t_ms:8.2f}")

# worst-start peak at each rate, as a fraction of the 20 kHz peak
worst = {}
for key in channels:
    y, unit = values(key)
    full = peak(y)
    worst[key] = []
    for k in factors:
        worst[key].append(min(peaks_by_start(y, k)) / full)

print(f"\nworst-start peak as % of the 20 kHz peak")
columns = []
for key in channels:
    columns.append(f"{key:>11}")
print(f"{'rate (Hz)':>9} " + ' '.join(columns))
for i in range(len(rates)):
    columns = []
    for key in channels:
        columns.append(f"{100 * worst[key][i]:11.1f}")
    print(f"{rates[i]:9d} " + ' '.join(columns))

# the lowest rate that every channel passes, with every faster rate passing too
lowest = rate_now
for i in range(len(rates)):
    failing = []
    for key in channels:
        if worst[key][i] < KEEP:
            failing.append(key)
    if len(failing) == 0:
        lowest = rates[i]
    else:
        print(f"\n{rates[i]} Hz is the first rate to fail: {', '.join(failing)}")
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
    percent = []
    for w in worst[key]:
        percent.append(100 * w)
    plt.semilogx(rates, percent, '.-', label=ch['comment'].title())
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
t_ms = []
for i in range(ch['n']):
    t_ms.append(1000 * (ch['t0'] + i * ch['dt']))
p = peaks_by_start(y, k)
best_start = p.index(max(p))         # index gives the position of a value in a list
worst_start = p.index(min(p))
plt.figure(figsize=(7.5, 4))
win = []                             # the samples from 40 to 70 ms
for i in range(ch['n']):
    if 40 <= t_ms[i] and t_ms[i] <= 70:
        win.append(i)
win_t = []
win_y = []
for i in win:
    win_t.append(t_ms[i])
    win_y.append(y[i])
plt.plot(win_t, win_y, color='gray', linewidth=0.8, label='recorded at 20000 Hz')


def plot_kept(start, mark, name):
    """The samples in the window that a logger starting at sample start keeps."""
    kept_t = []
    kept_y = []
    for i in win:
        if (i - start) % k == 0:
            kept_t.append(t_ms[i])
            kept_y.append(y[i])
    plt.plot(kept_t, kept_y, mark + '-', label=f'1000 Hz, {name} start (sample {start})')


plot_kept(best_start, 'o', 'best')
plot_kept(worst_start, 's', 'worst')
plt.xlabel('time from impact (ms)')
plt.ylabel('acceleration (g)')
plt.title(ch['comment'].title() + ' [' + ch['code'] + '], 40 to 70 ms',
          fontsize=10)
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('crossmember_1khz.svg')
