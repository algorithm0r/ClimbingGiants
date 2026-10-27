"""Assignment 8: an uncertainty interval on the driver's HIC15.

Run this from the unzipped pack folder. It
  1. measures the noise on the three driver head channels over the 50 ms
     before impact, including how much each sample resembles its neighbors,
  2. reruns the whole HIC15 calculation (CFC 1000 filter, resultant, 15 ms
     window search) 1000 times with noise added, for two noise models:
       independent: Gaussian noise drawn fresh for each sample, same sigma
       blocks:      10 ms pieces cut at random from the pre-impact record itself
  3. gives the 90% and 95% intervals for both,
  4. changes each judgment call that was held fixed (g and the baseline), one
     at a time, to see how far it moves HIC15.
Saves noise_before_impact.svg, noise_autocorrelation.svg and hic_draws.svg.
"""
import json
import math
import os

import numpy as np
import matplotlib.pyplot as plt

G = 9.80665        # standard gravity, m/s^2 in one g
DRAWS = 1000       # reruns per noise model
BLOCK = 200        # samples per block for the 'blocks' model (10 ms at 20 kHz)
CODES = ['11HEADCG0000ACXP', '11HEADCG0000ACYP', '11HEADCG0000ACZP']


def cfc(y, dt, cls):
    """SAE J211-1 four-pole Butterworth (Smoothing notes), forward then backward."""
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


def hic(a, dt, limit_ms):
    """Largest HIC over every window up to limit_ms, a = resultant in g.
    Prefix sum of the trapezoid integral, one numpy pass per window length."""
    panels = (a[1:] + a[:-1]) / 2 * dt
    S = np.concatenate([[0.0], np.cumsum(panels)])
    kmax = round(limit_ms / 1000 / dt)          # the limit in samples
    best = 0.0
    for k in range(1, kmax + 1):
        T = k * dt
        mean = np.clip((S[k:] - S[:-k]) / T, 0, None)   # every window of length k at once
        best = max(best, np.max(T * mean ** 2.5))
    return best


def pipeline(chs, dt, cls=1000, limit_ms=15, g=G):
    """The whole analysis: filter each component, resultant in g, HIC search.
    cls=None skips the filter."""
    if cls is not None:
        filtered = []
        for c in chs:
            filtered.append(cfc(c, dt, cls))
        chs = filtered
    total = 0
    for c in chs:
        total = total + c ** 2
    return hic(np.sqrt(total) / g, dt, limit_ms)


def autocorr(r, lag):
    """Correlation between the noise and itself shifted by lag samples."""
    return np.corrcoef(r[:-lag], r[lag:])[0, 1]


def independent_noise(pre, n, rng):
    return rng.normal(0, np.std(pre), n)


def block_noise(pre, n, rng):
    """Join random 10 ms pieces of the (mean-removed) pre-impact record."""
    r = pre - np.mean(pre)
    pieces = []
    for k in range(n // BLOCK + 1):
        s = rng.integers(0, len(r) - BLOCK + 1)     # a random start
        pieces.append(r[s:s + BLOCK])
    return np.concatenate(pieces)[:n]


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
before = t_ms < 0
raw = []                                # each channel's samples
pre = []                                # the part of each before impact
for c in chans:
    y = np.array(c['y'])
    raw.append(y)
    pre.append(y[before])

# 1. the noise
print(f"{len(chans)} head channels, {n} samples every {dt * 1000:g} ms, "
      f"{t_ms[0]:.2f} to {t_ms[-1]:.2f} ms")
print(f"pre-impact stretch: {np.sum(before)} samples, "
      f"{t_ms[0]:.2f} to {t_ms[before][-1]:.2f} ms")
LAGS = [1, 20, 100, 200]
columns = []
for lag in LAGS:
    columns.append(f'r({lag * dt * 1000:g} ms)')
print(f"{'code':18} {'prefilter':>9} {'mean':>7} {'sigma':>6} {'sigma':>7}   "
      + '  '.join(columns))
for m in range(len(chans)):
    c = chans[m]
    p = pre[m]
    r = p - np.mean(p)
    columns = []
    for lag in LAGS:
        columns.append(f'{autocorr(r, lag):9.2f}')
    print(f"{c['code']:18} {c['prefilter_hz']:>6} Hz {np.mean(p):7.3f} {np.std(p):6.3f} "
          f"{np.std(p) / G:6.4f}g   "
          + '  '.join(columns))

# 2. the value, then the reruns
value = pipeline(raw, dt)
print(f"\nHIC15 on the record: {value:.2f}")
rng = np.random.default_rng(310)
models = {'independent': independent_noise, 'blocks': block_noise}
draws = {}
for name, noise in models.items():      # noise is a function: one of the two above
    runs = []
    for k in range(DRAWS):
        noisy = []
        for m in range(len(raw)):
            noisy.append(raw[m] + noise(pre[m], n, rng))
        runs.append(pipeline(noisy, dt))
    draws[name] = np.array(runs)

# 3. the intervals
print(f"\n{'noise model':12} {'median':>7} {'90% interval':>17} {'width':>6} "
      f"{'95% interval':>17} {'width':>6}")
for name, d in draws.items():
    l90, h90, l95, h95 = np.percentile(d, [5, 95, 2.5, 97.5])
    print(f"{name:12} {np.median(d):7.2f} {l90:8.2f} to {h90:6.2f} {h90 - l90:6.2f} "
          f"{l95:8.2f} to {h95:6.2f} {h95 - l95:6.2f}")

# 4. what was held fixed, changed one at a time
l95, h95 = np.percentile(draws['blocks'], [2.5, 97.5])
print(f"\n{'held fixed, changed to':34} {'HIC15':>7} {'shift':>7} "
      f"{'x 95% width':>11}")
changes = {}
changes['g = 9.81'] = pipeline(raw, dt, g=9.81)
corrected = []
for m in range(len(raw)):
    corrected.append(raw[m] - np.mean(pre[m]))
changes['pre-impact mean subtracted'] = pipeline(corrected, dt)
for name, v in changes.items():
    ratio = abs(v - value) / (h95 - l95)
    print(f"{name:34} {v:7.2f} {v - value:+7.2f} {ratio:11.2f}")

# Figure 1: the pre-impact stretch of each channel
fig, axs = plt.subplots(3, 1, figsize=(8, 6), sharex=True)
for m in range(len(chans)):
    ax = axs[m]
    c = chans[m]
    ax.plot(t_ms[before], pre[m], linewidth=0.7)
    ax.set_title(f"{c['comment']}  [{c['code']}]", fontsize=9)
    ax.set_ylabel('acceleration (m/s$^2$)', fontsize=8)
axs[-1].set_xlabel('time from impact (ms)')
fig.suptitle('Driver head acceleration in the 50 ms before impact, test 9793',
             fontsize=10)
fig.tight_layout()
fig.savefig('noise_before_impact.svg')
plt.close(fig)

# Figure 2: how alike neighboring samples are
lags = np.arange(1, 501)
plt.figure(figsize=(8, 3.6))
for m in range(len(chans)):
    r = pre[m] - np.mean(pre[m])
    corr = []
    for lag in lags:
        corr.append(autocorr(r, lag))
    plt.plot(lags * dt * 1000, corr, label=chans[m]['code'])
plt.axhline(0, color='gray', linewidth=0.8)
plt.axvline(BLOCK * dt * 1000, color='gray', linestyle='--', linewidth=0.8,
            label='block length, 10 ms')
plt.title('Autocorrelation of the pre-impact noise (independent noise would sit at 0)')
plt.xlabel('lag (ms)')
plt.ylabel('autocorrelation (no units)')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('noise_autocorrelation.svg')
plt.close()

# Figure 3: the reruns under both noise models, 95% intervals marked
plt.figure(figsize=(8, 3.8))
lowest = min(np.min(draws['independent']), np.min(draws['blocks']))
highest = max(np.max(draws['independent']), np.max(draws['blocks']))
bins = np.linspace(lowest, highest, 50)
colors = {'independent': 'tab:blue', 'blocks': 'tab:orange'}
for name, d in draws.items():
    col = colors[name]
    lo, hi = np.percentile(d, [2.5, 97.5])
    plt.hist(d, bins=bins, alpha=0.6, color=col,
             label=f'{name}: 95% interval {lo:.2f} to {hi:.2f}')
    for v in (lo, hi):
        plt.axvline(v, color=col, linestyle='--', linewidth=1)
plt.axvline(value, color='black', linewidth=1.2,
            label=f'value on the record, {value:.2f}')
plt.title(f'HIC15 over {DRAWS} reruns for each noise model')
plt.xlabel('HIC15 (a in g, t in s)')
plt.ylabel('number of reruns')
plt.legend(fontsize=8)
plt.tight_layout()
plt.savefig('hic_draws.svg')
