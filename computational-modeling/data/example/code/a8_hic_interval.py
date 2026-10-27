"""Assignment 8: a value, an interval and a level for the driver's HIC15.

Run this from the unzipped pack folder. It computes HIC15 once on the record,
then adds random noise to the three head channels 1000 times, runs the whole
calculation again each time, and takes the middle 90% of the answers as the
interval. The size of the noise comes from the 50 ms before impact, when the
car is not decelerating yet. Saves the figure hic_interval.svg.
"""
import json
import math
import os

import numpy as np
import matplotlib.pyplot as plt

G = 9.80665        # standard gravity, m/s^2 in one g
LIMIT_MS = 15      # FMVSS 208 S6.2: windows no longer than 15 ms
DRAWS = 1000       # how many times the whole calculation is rerun
LEVEL = 90         # confidence level of the interval, in percent
CODES = ['11HEADCG0000ACXP', '11HEADCG0000ACYP', '11HEADCG0000ACZP']


def cfc(y, dt, cls):
    """SAE J211 filter (the one from the Smoothing notes), forward then backward."""
    wd = 2 * math.pi * cls * 2.0775
    wa = math.tan(wd * dt / 2)
    d = 1 + math.sqrt(2) * wa + wa ** 2
    a0 = wa ** 2 / d
    b1 = -2 * (wa ** 2 - 1) / d
    b2 = (-1 + math.sqrt(2) * wa - wa ** 2) / d

    def one_pass(x):
        out = np.zeros(len(x))
        for i in range(2, len(x)):
            out[i] = (a0 * x[i] + 2 * a0 * x[i - 1] + a0 * x[i - 2]
                      + b1 * out[i - 1] + b2 * out[i - 2])
        return out

    forward = one_pass(y)
    backward = one_pass(forward[::-1])
    return backward[::-1]


def hic15(a, dt):
    """Largest HIC over every window up to 15 ms. a is the resultant in g.
    Loops over window lengths and lets numpy do all the start times at once,
    because the plain double loop from assignment 6 is too slow to run 1000 times."""
    panels = (a[1:] + a[:-1]) / 2 * dt
    S = np.concatenate([[0.0], np.cumsum(panels)])
    kmax = round(LIMIT_MS / 1000 / dt)          # 15 ms in samples
    best = 0.0
    for k in range(1, kmax + 1):
        T = k * dt
        mean = np.clip((S[k:] - S[:-k]) / T, 0, None)   # every window of length k at once
        best = max(best, np.max(T * mean ** 2.5))
    return best


def whole_calculation(x, y, z, dt):
    """Filter each channel at CFC 1000, form the resultant in g, search for HIC15."""
    fx = cfc(x, dt, 1000)
    fy = cfc(y, dt, 1000)
    fz = cfc(z, dt, 1000)
    return hic15(np.sqrt(fx ** 2 + fy ** 2 + fz ** 2) / G, dt)


name = os.listdir('crash')[0]           # the crash folder holds one file
with open(os.path.join('crash', name)) as f:
    test = json.load(f)
chans = []
for c in test['channels'].values():
    if c['code'] in CODES:
        chans.append(c)
dt = chans[0]['dt']
n = chans[0]['n']
t0 = chans[0]['t0']
t_ms = 1000 * (t0 + dt * np.arange(n))
before = t_ms < 0                       # the 50 ms before impact
x = np.array(chans[0]['y'])
y = np.array(chans[1]['y'])
z = np.array(chans[2]['y'])
heads = [x, y, z]

# how much each channel wobbles when nothing is happening
sigmas = []
for m in range(3):
    c = chans[m]
    ch = heads[m]
    s = np.std(ch[before])
    sigmas.append(s)
    print(f"{c['code']} ({c['unit']}, status {c['status']})  before impact: "
          f"{np.sum(before)} samples, mean {np.mean(ch[before]):6.3f} m/s^2, "
          f"sigma {s:.3f} m/s^2 = {s / G:.4f} g")

value = whole_calculation(x, y, z, dt)
print(f"HIC15 on the record as measured: {value:.2f}")

# check on my own choice not to subtract the pre-impact mean
no_offset = whole_calculation(x - np.mean(x[before]), y - np.mean(y[before]),
                              z - np.mean(z[before]), dt)
print(f"HIC15 with the pre-impact mean subtracted: {no_offset:.2f} "
      f"(moves it by {no_offset - value:+.2f})")

# rerun everything with fresh noise of the same size on each channel
rng = np.random.default_rng(8)
draws = []
for k in range(DRAWS):
    nx = x + rng.normal(0, sigmas[0], n)
    ny = y + rng.normal(0, sigmas[1], n)
    nz = z + rng.normal(0, sigmas[2], n)
    draws.append(whole_calculation(nx, ny, nz, dt))
draws = np.array(draws)
tail = (100 - LEVEL) / 2                # 5% cut off each end for a 90% interval
lo, hi = np.percentile(draws, [tail, 100 - tail])
print(f"{DRAWS} draws: median {np.median(draws):.2f}, smallest {np.min(draws):.2f}, "
      f"largest {np.max(draws):.2f}")
print(f"{LEVEL}% interval {lo:.2f} to {hi:.2f} (width {hi - lo:.2f})")

# figure: the noise I measured on the left, what it does to HIC15 on the right
fig, axes = plt.subplots(1, 2, figsize=(11, 4))
a = axes[0]
b = axes[1]
for m in range(3):
    c = chans[m]
    a.plot(t_ms[before], heads[m][before], linewidth=0.7,
           label=f"{c['code'][-2]} direction, sigma {sigmas[m]:.2f} m/s$^2$")
a.set_title('Driver head channels before impact (test 9793)')
a.set_xlabel('time from impact (ms)')
a.set_ylabel('head acceleration (m/s$^2$)')
a.legend(fontsize=8)
b.hist(draws, bins=30)
b.axvspan(lo, hi, color='tab:orange', alpha=0.3,
          label=f'{LEVEL}% interval, {lo:.2f} to {hi:.2f}')
b.axvline(value, color='tab:red', label=f'value on the record, {value:.2f}')
b.set_title(f'HIC15 over {DRAWS} reruns with that noise added')
b.set_xlabel('HIC15 (a in g, t in s)')
b.set_ylabel('number of reruns')
b.legend(fontsize=8, loc='upper left')
b.set_ylim(0, b.get_ylim()[1] * 1.3)    # room for the legend above the bars
fig.tight_layout()
fig.savefig('hic_interval.svg')
