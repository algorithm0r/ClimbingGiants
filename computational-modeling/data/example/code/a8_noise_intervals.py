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

    return one_pass(one_pass(y)[::-1])[::-1]


def hic(a, dt, limit_ms):
    """Largest HIC over every window up to limit_ms, a = resultant in g.
    Prefix sum of the trapezoid integral, one numpy pass per window length."""
    S = np.concatenate([[0.0], np.cumsum((a[1:] + a[:-1]) / 2 * dt)])
    best = 0.0
    for k in range(1, round(limit_ms / 1000 / dt) + 1):
        T = k * dt
        mean = np.clip((S[k:] - S[:-k]) / T, 0, None)
        best = max(best, (T * mean ** 2.5).max())
    return best


def pipeline(chs, dt, cls=1000, limit_ms=15, g=G):
    """The whole analysis: filter each component, resultant in g, HIC search.
    cls=None skips the filter."""
    if cls is not None:
        chs = [cfc(c, dt, cls) for c in chs]
    return hic(np.sqrt(sum(c ** 2 for c in chs)) / g, dt, limit_ms)


def autocorr(r, lag):
    """Correlation between the noise and itself shifted by lag samples."""
    return np.corrcoef(r[:-lag], r[lag:])[0, 1]


def independent_noise(pre, n, rng):
    return rng.normal(0, pre.std(), n)


def block_noise(pre, n, rng):
    """Join random 10 ms pieces of the (mean-removed) pre-impact record."""
    r = pre - pre.mean()
    pieces = []
    for _ in range(n // BLOCK + 1):
        s = rng.integers(0, len(r) - BLOCK + 1)
        pieces.append(r[s:s + BLOCK])
    return np.concatenate(pieces)[:n]


with open(os.path.join('crash', os.listdir('crash')[0])) as f:
    test = json.load(f)
chans = [c for c in test['channels'].values() if c['code'] in CODES]
dt, n, t0 = chans[0]['dt'], chans[0]['n'], chans[0]['t0']
t_ms = 1000 * (t0 + dt * np.arange(n))
before = t_ms < 0
raw = [np.array(c['y']) for c in chans]
pre = [c[before] for c in raw]

# 1. the noise
print(f"{len(chans)} head channels, {n} samples every {dt * 1000:g} ms, "
      f"{t_ms[0]:.2f} to {t_ms[-1]:.2f} ms")
print(f"pre-impact stretch: {before.sum()} samples, "
      f"{t_ms[0]:.2f} to {t_ms[before][-1]:.2f} ms")
LAGS = [1, 20, 100, 200]
print(f"{'code':18} {'prefilter':>9} {'mean':>7} {'sigma':>6} {'sigma':>7}   "
      + '  '.join(f'r({l * dt * 1000:g} ms)' for l in LAGS))
for c, p in zip(chans, pre):
    r = p - p.mean()
    print(f"{c['code']:18} {c['prefilter_hz']:>6} Hz {p.mean():7.3f} {p.std():6.3f} "
          f"{p.std() / G:6.4f}g   "
          + '  '.join(f'{autocorr(r, l):9.2f}' for l in LAGS))

# 2. the value, then the reruns
value = pipeline(raw, dt)
print(f"\nHIC15 on the record: {value:.2f}")
rng = np.random.default_rng(310)
draws = {}
for name, noise in (('independent', independent_noise), ('blocks', block_noise)):
    runs = []
    for _ in range(DRAWS):
        runs.append(pipeline([c + noise(p, n, rng) for c, p in zip(raw, pre)], dt))
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
changes = [('g = 9.81', pipeline(raw, dt, g=9.81)),
           ('pre-impact mean subtracted',
            pipeline([c - p.mean() for c, p in zip(raw, pre)], dt))]
for name, v in changes:
    ratio = abs(v - value) / (h95 - l95)
    print(f"{name:34} {v:7.2f} {v - value:+7.2f} {ratio:11.2f}")

# Figure 1: the pre-impact stretch of each channel
fig, axs = plt.subplots(3, 1, figsize=(8, 6), sharex=True)
for ax, c, p in zip(axs, chans, pre):
    ax.plot(t_ms[before], p, linewidth=0.7)
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
for c, p in zip(chans, pre):
    r = p - p.mean()
    plt.plot(lags * dt * 1000, [autocorr(r, l) for l in lags], label=c['code'])
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
bins = np.linspace(min(d.min() for d in draws.values()),
                   max(d.max() for d in draws.values()), 50)
for (name, d), col in zip(draws.items(), ('tab:blue', 'tab:orange')):
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
