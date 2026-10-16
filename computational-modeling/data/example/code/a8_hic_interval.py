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

    return one_pass(one_pass(y)[::-1])[::-1]


def hic15(a, dt):
    """Largest HIC over every window up to 15 ms. a is the resultant in g.
    Loops over window lengths and lets numpy do all the start times at once,
    because the plain double loop from assignment 6 is too slow to run 1000 times."""
    S = np.concatenate([[0.0], np.cumsum((a[1:] + a[:-1]) / 2 * dt)])
    best = 0.0
    for k in range(1, round(LIMIT_MS / 1000 / dt) + 1):
        T = k * dt
        mean = np.clip((S[k:] - S[:-k]) / T, 0, None)
        best = max(best, (T * mean ** 2.5).max())
    return best


def whole_calculation(x, y, z, dt):
    """Filter each channel at CFC 1000, form the resultant in g, search for HIC15."""
    fx, fy, fz = cfc(x, dt, 1000), cfc(y, dt, 1000), cfc(z, dt, 1000)
    return hic15(np.sqrt(fx ** 2 + fy ** 2 + fz ** 2) / G, dt)


with open(os.path.join('crash', os.listdir('crash')[0])) as f:
    test = json.load(f)
chans = [c for c in test['channels'].values() if c['code'] in CODES]
dt, n, t0 = chans[0]['dt'], chans[0]['n'], chans[0]['t0']
t_ms = 1000 * (t0 + dt * np.arange(n))
before = t_ms < 0                       # the 50 ms before impact
x, y, z = [np.array(c['y']) for c in chans]

# how much each channel wobbles when nothing is happening
sigmas = []
for c, ch in zip(chans, (x, y, z)):
    s = ch[before].std()
    sigmas.append(s)
    print(f"{c['code']} ({c['unit']}, status {c['status']})  before impact: "
          f"{before.sum()} samples, mean {ch[before].mean():6.3f} m/s^2, "
          f"sigma {s:.3f} m/s^2 = {s / G:.4f} g")

value = whole_calculation(x, y, z, dt)
print(f"HIC15 on the record as measured: {value:.2f}")

# check on my own choice not to subtract the pre-impact mean
no_offset = whole_calculation(*[ch - ch[before].mean() for ch in (x, y, z)], dt)
print(f"HIC15 with the pre-impact mean subtracted: {no_offset:.2f} "
      f"(moves it by {no_offset - value:+.2f})")

# rerun everything with fresh noise of the same size on each channel
rng = np.random.default_rng(8)
draws = []
for k in range(DRAWS):
    nx, ny, nz = [ch + rng.normal(0, s, n) for ch, s in zip((x, y, z), sigmas)]
    draws.append(whole_calculation(nx, ny, nz, dt))
draws = np.array(draws)
lo, hi = np.percentile(draws, [(100 - LEVEL) / 2, 100 - (100 - LEVEL) / 2])
print(f"{DRAWS} draws: median {np.median(draws):.2f}, smallest {draws.min():.2f}, "
      f"largest {draws.max():.2f}")
print(f"{LEVEL}% interval {lo:.2f} to {hi:.2f} (width {hi - lo:.2f})")

# figure: the noise I measured on the left, what it does to HIC15 on the right
fig, (a, b) = plt.subplots(1, 2, figsize=(11, 4))
for c, ch, s in zip(chans, (x, y, z), sigmas):
    a.plot(t_ms[before], ch[before], linewidth=0.7,
           label=f"{c['code'][-2]} direction, sigma {s:.2f} m/s$^2$")
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
