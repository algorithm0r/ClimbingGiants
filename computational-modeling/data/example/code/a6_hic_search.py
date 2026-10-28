"""Assignment 6: HIC for the driver's head, and what the search costs.

Run this from the unzipped pack folder. It:
  1. reads the three driver head channels by code and filters each at CFC 1000,
  2. forms the resultant in g,
  3. finds the best window for every window length with a prefix sum,
     one numpy pass per length, which gives HIC15 and the limit-free value,
  4. counts and times the windows, and counts what direct integration would cost,
  5. runs three checks (a plain double loop, no filter, baseline removed).
Figures saved: head_components.svg, hic_windows.svg, hic_vs_limit.svg
"""
import glob
import json
import time

import matplotlib.pyplot as plt
import numpy as np

G = 9.80665            # standard gravity (m/s^2)
CODES = ['11HEADCG0000ACXP', '11HEADCG0000ACYP', '11HEADCG0000ACZP']
LIMITS_MS = [15]       # FMVSS 208


def cfc(y, dt, cls):
    """SAE J211-1 Butterworth (Smoothing notes), run forward then backward."""
    wd = 2 * np.pi * cls * 2.0775
    wa = np.tan(wd * dt / 2)
    d = 1 + np.sqrt(2) * wa + wa**2
    a0 = wa**2 / d
    a1 = 2 * a0
    a2 = a0
    b1 = -2 * (wa**2 - 1) / d
    b2 = (-1 + np.sqrt(2) * wa - wa**2) / d

    def one_pass(x):
        out = np.zeros_like(x)
        for i in range(2, len(x)):
            out[i] = (a0 * x[i] + a1 * x[i - 1] + a2 * x[i - 2]
                      + b1 * out[i - 1] + b2 * out[i - 2])
        return out

    forward = one_pass(y)
    backward = one_pass(forward[::-1])
    return backward[::-1]


def resultant_g(comps):
    total = 0
    for c in comps:
        total = total + c**2
    return np.sqrt(total) / G


def best_by_length(a, dt, kmax):
    """For each window length k = 1..kmax samples, the best HIC over every
    start. The prefix sum S makes each window's integral one subtraction."""
    panels = (a[1:] + a[:-1]) / 2 * dt
    S = np.concatenate([[0.0], np.cumsum(panels)])
    best = np.zeros(kmax + 1)
    start = np.zeros(kmax + 1, dtype=int)
    windows = 0
    for k in range(1, kmax + 1):
        T = k * dt
        mean = (S[k:] - S[:-k]) / T          # every window of length k at once
        h = T * np.clip(mean, 0, None)**2.5
        start[k] = np.argmax(h)
        best[k] = h[start[k]]
        windows = windows + len(h)
    return best, start, windows


def hic(a, dt, kmax):
    """HIC with windows up to kmax samples: (value, start, end, windows)."""
    best, start, windows = best_by_length(a, dt, kmax)
    k = int(np.argmax(best))
    return best[k], start[k], start[k] + k, windows


def hic_loops(a, dt, kmax):
    """The same search as two plain loops, as a check on the numpy version."""
    a = list(a)
    S = [0.0]
    for i in range(1, len(a)):
        S.append(S[-1] + (a[i] + a[i - 1]) / 2 * dt)
    best = 0.0
    for i in range(len(a) - 1):
        last = min(i + kmax, len(a) - 1)
        for j in range(i + 1, last + 1):
            mean = (S[j] - S[i]) / ((j - i) * dt)
            if mean > 0:
                best = max(best, (j - i) * dt * mean**2.5)
    return best


# ---- read and filter
t_start = time.perf_counter()
name = glob.glob('crash/*.json')[0]     # the crash folder holds one test file
with open(name) as f:
    test = json.load(f)
by_code = {}                            # each channel under its ISO code
for c in test['channels'].values():
    by_code[c['code']] = c
chans = []
for code in CODES:
    chans.append(by_code[code])
dt = chans[0]['dt']
n = chans[0]['n']
t = (chans[0]['t0'] + dt * np.arange(n)) * 1000          # ms
raw = []
filt = []
for c in chans:
    y = np.array(c['y'])
    raw.append(y)
    filt.append(cfc(y, dt, 1000))
res = resultant_g(filt)
t_read = time.perf_counter() - t_start
print(f"test {test['testNo']}, {n} samples at dt = {dt * 1000:.2f} ms "
      f"({1 / dt:.0f} per second), {t[0]:.0f} to {t[-1]:.0f} ms")
for m in range(len(chans)):
    c = chans[m]
    print(f"  {c['code']}  {c['unit']}  {c['status']}  "
          f"raw peak {np.max(np.abs(raw[m])) / G:5.1f} g  "
          f"CFC 1000 peak {np.max(np.abs(filt[m])) / G:5.1f} g")
p = int(np.argmax(res))
print(f"resultant: peak {res[p]:.2f} g at {t[p]:.2f} ms, "
      f"mean before impact {np.mean(res[t < 0]):.3f} g")
# the filter starts each pass from zero, so look at the ends of the record
raw_res = resultant_g(raw)
for i in [-11, -5, -3, -1]:
    print(f"  at {t[i]:.2f} ms: unfiltered {raw_res[i]:.2f} g, "
          f"CFC 1000 {res[i]:.2f} g")
print(f"read and filter: {t_read:.3f} s")

# ---- HIC for each limit, and with no limit
print(f"{'limit':>8} {'HIC':>7} {'from (ms)':>10} {'to (ms)':>8} {'length':>7} "
      f"{'mean g':>7} {'windows':>11} {'time (s)':>9}")
found = {}
for lim in LIMITS_MS + [None]:
    if lim is None:
        kmax = n - 1
    else:
        kmax = round(lim / 1000 / dt)
    t0 = time.perf_counter()
    h, i, j, w = hic(res, dt, kmax)
    secs = time.perf_counter() - t0
    found[lim] = (h, i, j, w, secs)
    mean = (h / ((j - i) * dt))**(1 / 2.5)
    if lim is None:
        label = 'none'
    else:
        label = f'{lim} ms'
    print(f"{label:>8} {h:7.1f} {t[i]:10.2f} {t[j]:8.2f} "
          f"{(j - i) * dt * 1000:7.2f} {mean:7.1f} {w:11,} {secs:9.3f}")

# ---- what the search costs
kmax = round(15 / 1000 / dt)
# integrating directly: one addition per sample, for every window
direct = 0
for k in range(1, kmax + 1):
    direct = direct + k * (n - k)
h15, i15, j15, w15, s15 = found[15]
print(f"HIC15 windows: {w15:,} subtractions with the prefix sum, "
      f"{direct:,} additions integrating each window directly "
      f"({direct / w15:.0f} times as many)")
w_all = found[None][3]
print(f"no limit: {w_all:,} windows, {w_all / w15:.1f} times as many")
per_test = t_read + s15
print(f"one test: {per_test:.2f} s (read and filter {t_read:.2f} s, "
      f"search {s15:.3f} s), 200 tests: {200 * per_test:.0f} s")

# ---- checks
t0 = time.perf_counter()
print(f"check, plain double loop: HIC15 = {hic_loops(res, dt, kmax):.1f} "
      f"in {time.perf_counter() - t0:.2f} s")
print(f"check, no filter: HIC15 = {hic(resultant_g(raw), dt, kmax)[0]:.1f}")
before = t < 0
debiased = []
for y in filt:
    debiased.append(y - np.mean(y[before]))
print(f"check, each component's mean before impact removed: "
      f"HIC15 = {hic(resultant_g(debiased), dt, kmax)[0]:.1f}")

# ---- figure 1: the three filtered components
plt.figure(figsize=(8, 4))
for m in range(len(chans)):
    c = chans[m]
    plt.plot(t, filt[m] / G, linewidth=0.8,
             label=f"{c['code'][-2]}, {c['direction'].lower()}")
plt.xlabel('time from impact (ms)')
plt.ylabel('head acceleration, CFC 1000 (g)')
plt.title(f"Test {test['testNo']}, driver head CG, components at CFC 1000")
plt.legend()
plt.tight_layout()
plt.savefig('head_components.svg')
plt.close()

# ---- figure 2: the resultant with the HIC15 window
plt.figure(figsize=(8, 4))
plt.plot(t, res, linewidth=0.8, color='k', label='resultant, CFC 1000', zorder=3)
plt.axvspan(t[i15], t[j15], color='tab:orange', alpha=0.4,
            label=f'HIC15 = {h15:.1f}, {t[i15]:.2f} to {t[j15]:.2f} ms')
plt.xlim(0, 160)
plt.ylim(0, max(62, 1.35 * np.max(res)))    # room for the legend above the trace
plt.xlabel('time from impact (ms)')
plt.ylabel('resultant head acceleration (g)')
plt.title(f"Test {test['testNo']}, driver head resultant and the best window")
plt.legend(loc='upper left', fontsize=8)
plt.tight_layout()
plt.savefig('hic_windows.svg')
plt.close()

# ---- figure 3: HIC against the window length limit
best, start, windows = best_by_length(res, dt, round(80 / 1000 / dt))
limit_ms = np.arange(1, len(best)) * dt * 1000
plt.figure(figsize=(8, 4))
plt.plot(limit_ms, np.maximum.accumulate(best[1:]), color='k')
for lim in LIMITS_MS:
    plt.axvline(lim, color='gray', linestyle='--', linewidth=0.8)
    plt.annotate(f'HIC{lim} = {found[lim][0]:.1f}', (lim, found[lim][0]),
                 xytext=(5, -15), textcoords='offset points')
hn = found[None][0]
inn = found[None][1]
jn = found[None][2]
plt.plot((jn - inn) * dt * 1000, hn, 'o', color='tab:red',
         label=f'no limit: {hn:.1f} over {(jn - inn) * dt * 1000:.2f} ms')
plt.xlabel('longest window allowed (ms)')
plt.ylabel('HIC (a in g, t in s)')
plt.title(f"Test {test['testNo']}, driver HIC against the window length limit")
plt.legend(loc='lower right')
plt.tight_layout()
plt.savefig('hic_vs_limit.svg')
