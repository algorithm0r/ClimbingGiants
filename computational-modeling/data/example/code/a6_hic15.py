"""Assignment 6: the head injury criterion (HIC15) for the driver.

Run this from the unzipped pack folder. It filters the three driver head
channels at CFC 1000, forms the resultant in g, and searches every window
no longer than 15 ms for the largest HIC. It counts the windows and times
the search, then runs the same search with no length limit to see what
the limit saves. Saves the figure hic15_window.svg.
"""
import json
import math
import os
import time

import matplotlib.pyplot as plt

G = 9.80665        # standard gravity, m/s^2 in one g
LIMIT_MS = 15      # FMVSS 208 S6.2: windows no longer than 15 ms
HIC_PASS = 700     # FMVSS 208 S6.2: HIC15 limit, 50th percentile male dummy
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
        out = [0.0] * len(x)
        for i in range(2, len(x)):
            out[i] = (a0 * x[i] + 2 * a0 * x[i - 1] + a0 * x[i - 2]
                      + b1 * out[i - 1] + b2 * out[i - 2])
        return out

    forward = one_pass(y)
    backward = one_pass(forward[::-1])
    return backward[::-1]


def search(a, dt, kmax):
    """Largest HIC over every window of up to kmax samples. Returns
    (hic, start index, end index, number of windows looked at)."""
    # running total of the trapezoid integral, so a window's integral is S[j] - S[i]
    S = [0.0]
    for i in range(1, len(a)):
        S.append(S[-1] + (a[i] + a[i - 1]) / 2 * dt)
    best = 0.0
    bi = 0
    bj = 0
    count = 0
    for i in range(len(a) - 1):
        last = min(i + kmax, len(a) - 1)       # the last end allowed for this start
        for j in range(i + 1, last + 1):
            count = count + 1
            T = (j - i) * dt
            mean = (S[j] - S[i]) / T
            if mean > 0:                       # a negative mean has no 2.5 power
                score = T * mean ** 2.5
                if score > best:
                    best = score
                    bi = i
                    bj = j
    return best, bi, bj, count


start = time.perf_counter()
name = os.listdir('crash')[0]
with open(os.path.join('crash', name)) as f:
    test = json.load(f)
v = test['vehicle']
print(f"Test {test['testNo']}: {v['year']} {v['make']} {v['model']}, "
      f"{test['test']['config']} at {test['test']['speed_kph']} km/h")

chans = []
for c in test['channels'].values():
    if c['code'] in CODES:
        chans.append(c)
for c in chans:
    print(f"  using {c['code']}  {c['comment']}  {c['unit']}  {c['status']}")
dt = chans[0]['dt']
n = chans[0]['n']
t0 = chans[0]['t0']
t_ms = []
for i in range(n):
    t_ms.append(1000 * (t0 + i * dt))

# filter each component at CFC 1000, then the resultant, in g
x = cfc(chans[0]['y'], dt, 1000)
y = cfc(chans[1]['y'], dt, 1000)
z = cfc(chans[2]['y'], dt, 1000)
res = []
for i in range(n):
    res.append(math.sqrt(x[i] * x[i] + y[i] * y[i] + z[i] * z[i]) / G)
k = 0                                   # the index of the peak
for i in range(n):
    if res[i] > res[k]:
        k = i
print(f"peak resultant {res[k]:.1f} g at {t_ms[k]:.2f} ms")

kmax = round(LIMIT_MS / 1000 / dt)      # 15 ms in samples
print(f"dt = {dt * 1000} ms, {n} samples, so 15 ms is {kmax} sample steps")

t1 = time.perf_counter()
hic, i, j, count = search(res, dt, kmax)
t_search = time.perf_counter() - t1
t_one_test = time.perf_counter() - start
mean_g = (hic / ((j - i) * dt)) ** (1 / 2.5)
print(f"HIC15 = {hic:.1f} from {t_ms[i]:.2f} to {t_ms[j]:.2f} ms "
      f"({(j - i) * dt * 1000:.2f} ms long, mean {mean_g:.1f} g)")
if hic < HIC_PASS:
    verdict = 'passes'
else:
    verdict = 'fails'
print(f"{verdict} the FMVSS 208 limit of {HIC_PASS}")
print(f"windows looked at: {count:,} in {t_search:.2f} s")
print(f"whole program for one test so far: {t_one_test:.2f} s")

# the same search with no length limit, to see what the limit saves
t1 = time.perf_counter()
hic_all, i2, j2, count_all = search(res, dt, n)
t_all = time.perf_counter() - t1
print(f"no limit: HIC = {hic_all:.1f} from {t_ms[i2]:.2f} to {t_ms[j2]:.2f} ms, "
      f"{count_all:,} windows in {t_all:.2f} s")
print(f"the limit cuts the windows by a factor of {count_all / count:.1f}")
print(f"200 tests: {200 * t_one_test / 60:.1f} min with the limit, "
      f"{200 * (t_one_test - t_search + t_all) / 60:.1f} min without")

# figure: the resultant with the chosen window shaded
plt.figure(figsize=(8, 4))
plt.plot(t_ms, res, linewidth=0.8, label='resultant, CFC 1000')
plt.axvspan(t_ms[i], t_ms[j], color='tab:orange', alpha=0.3,
            label=f'HIC15 window, {t_ms[i]:.2f} to {t_ms[j]:.2f} ms')
plt.plot(t_ms[k], res[k], 'o', color='tab:red',
         label=f'peak {res[k]:.1f} g at {t_ms[k]:.2f} ms')
plt.xlabel('time from impact (ms)')
plt.ylabel('resultant head acceleration (g)')
plt.title(f"Test {test['testNo']} driver head (11HEADCG), HIC15 = {hic:.1f}")
plt.legend()
plt.tight_layout()
plt.savefig('hic15_window.svg')
