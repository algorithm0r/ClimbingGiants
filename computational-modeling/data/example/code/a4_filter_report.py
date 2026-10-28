"""Assignment 4: peak crossmember acceleration filtered to SAE J211-1.

Run this from the unzipped pack folder. It finds the crossmember channel,
checks the filter, filters the channel at every class J211 defines, and prints
the numbers in the report. It saves three figures:
  fig_raw.svg      the whole record, as recorded and at CFC 60
  fig_classes.svg  the main pulse at each filter class
  fig_onepass.svg  CFC 60 run once and run forward and backward
"""
import glob
import json
import os

import matplotlib.pyplot as plt
import numpy as np

G = 9.80665          # standard gravity, m/s^2
CLASSES = [1000, 600, 180, 60]
PACK = '.'


def cfc_coefficients(cls, dt):
    """SAE J211-1 coefficients, as given in the course notes (Smoothing)."""
    wd = 2 * np.pi * cls * 2.0775
    wa = np.tan(wd * dt / 2)
    d = 1 + np.sqrt(2) * wa + wa ** 2
    a0 = wa ** 2 / d
    b1 = -2 * (wa ** 2 - 1) / d
    b2 = (-1 + np.sqrt(2) * wa - wa ** 2) / d
    return a0, 2 * a0, a0, b1, b2


def one_pass(x, c, start=0.0):
    """One pass in the direction of increasing index. start is the value given to
    the first two outputs, which the formula cannot compute."""
    a0, a1, a2, b1, b2 = c
    out = np.zeros(len(x))
    out[0] = start
    out[1] = start
    for i in range(2, len(x)):
        out[i] = (a0 * x[i] + a1 * x[i - 1] + a2 * x[i - 2]
                  + b1 * out[i - 1] + b2 * out[i - 2])
    return out


def cfc(y, dt, cls, start_at_data=False):
    """Forward, then backward over the forward result. With start_at_data the
    filter starts from the first sample instead of from zero."""
    c = cfc_coefficients(cls, dt)
    start = 0.0
    if start_at_data:
        start = y[0]
    fwd = one_pass(y, c, start)[::-1]       # forward, then reversed
    start = 0.0
    if start_at_data:
        start = fwd[0]
    back = one_pass(fwd, c, start)          # forward again over the reversed record
    return back[::-1]


def peak(t, y):
    i = int(np.argmax(np.abs(y)))
    return y[i], t[i]


name = glob.glob(os.path.join(PACK, 'crash', '*.json'))[0]   # the one test file
with open(name) as f:
    test = json.load(f)

# the car-body channel: its header names the crossmember, or on some packs the sill
key = 'vehicle_x'
ch = test['channels'][key]
dt = ch['dt']
t = 1000 * (ch['t0'] + dt * np.arange(ch['n']))      # ms
raw = np.array(ch['y'])
print(f"channel '{key}': {ch['comment']} [{ch['code']}]")
print(f"  {ch['location']}, {ch['direction']}, {ch['unit']}, status {ch['status']}, "
      f"prefilter {ch['prefilter_hz']} Hz")
print(f"  {ch['n']} samples, {1 / dt:.0f} samples/s, {t[0]:.0f} to {t[-1]:.0f} ms")
print(f"  test speed {test['test']['speed_kph']} km/h = {test['test']['speed_kph'] / 3.6:.2f} m/s")

# how wide is the unfiltered peak? count the samples around it above half its size
i = int(np.argmax(np.abs(raw)))
lo = i
hi = i
while abs(raw[lo - 1]) > abs(raw[i]) / 2:
    lo = lo - 1
while abs(raw[hi + 1]) > abs(raw[i]) / 2:
    hi = hi + 1
print(f"  unfiltered peak {raw[i]:.1f} m/s^2 at {t[i]:.2f} ms, above half that from "
      f"{t[lo]:.2f} to {t[hi]:.2f} ms ({hi - lo + 1} samples)")
window = (t > 45) & (t < 60)              # True for the samples between 45 and 60 ms
first = int(np.argmax(t > 45))             # the index of the first sample after 45 ms
j = int(np.argmax(raw[window])) + first    # the window's largest value, as an index into raw
print(f"  largest positive value between 45 and 60 ms: {raw[j]:.1f} m/s^2 at {t[j]:.2f} ms")

print("\nchecks")
for cls in CLASSES:
    a0, a1, a2, b1, b2 = cfc_coefficients(cls, dt)
    print(f"  CFC {cls:4}: gain on a constant {(a0 + a1 + a2) / (1 - b1 - b2):.12f}, "
          f"needs more than {4.155 * cls:.0f} samples/s")
y60 = cfc(raw, dt, 60)
p60, tp60 = peak(t, y60)
p, tp = peak(t, cfc(raw, dt, 60, start_at_data=True))
print(f"  start from first sample instead of zero: {p:.2f} m/s^2 at {tp:.2f} ms")
offset = np.mean(raw[t < 0])
p, tp = peak(t, cfc(raw - offset, dt, 60))
print(f"  pre-impact mean {offset:.3f} m/s^2 removed first: {p:.2f} m/s^2 at {tp:.2f} ms")
print(f"  in g: {p60 / G:.3f} with g = {G}, {p60 / 9.81:.3f} with g = 9.81")

print("\nresult at CFC 60, forward and backward")
print(f"  peak {p60:.2f} m/s^2 = {p60 / G:.2f} g at {tp60:.2f} ms")
print(f"  the unfiltered peak is {raw[i] / p60:.2f} times this")

print("\nevery class")
print(f"  {'filter':12} {'peak m/s^2':>11} {'peak g':>8} {'at ms':>7} {'delta-v m/s':>12}")
filtered = {'as recorded': raw}
for cls in CLASSES:
    filtered[f'CFC {cls}'] = cfc(raw, dt, cls)
for label, y in filtered.items():
    p, tp = peak(t, y)
    dv = np.sum((y[1:] + y[:-1]) / 2) * dt        # trapezoid rule, whole record
    print(f"  {label:12} {p:11.1f} {p / G:8.1f} {tp:7.2f} {dv:12.3f}")

one = one_pass(raw, cfc_coefficients(60, dt))
p1, tp1 = peak(t, one)
print(f"\nCFC 60 forward pass only: {p1:.2f} m/s^2 = {p1 / G:.2f} g at {tp1:.2f} ms "
      f"({tp1 - tp60:+.2f} ms)")

# Figure 1: the whole record
plt.figure(figsize=(8, 3.6))
plt.plot(t, raw / G, color='lightgray', linewidth=0.7, label='as recorded')
plt.plot(t, y60 / G, linewidth=1.4, label='CFC 60, forward and backward')
plt.plot(tp60, p60 / G, 'ko', markersize=4)
plt.annotate(f"{p60 / G:.1f} g at {tp60:.1f} ms", (tp60, p60 / G), xytext=(12, -6),
             textcoords='offset points', fontsize=8)
plt.xlabel('time from impact (ms)')
plt.ylabel('X acceleration (g)')
plt.title(f"Left rear seat crossmember [{ch['code']}], test {test['testNo']}", fontsize=10)
plt.legend(loc='lower right', fontsize=8)
plt.tight_layout()
plt.savefig('fig_raw.svg')
plt.close()

# Figure 2: the main pulse at every class
plt.figure(figsize=(8, 3.6))
for label, y in filtered.items():
    if label == 'as recorded':
        plt.plot(t, y / G, color='lightgray', linewidth=0.7, label=label)
    else:
        plt.plot(t, y / G, linewidth=1.1, label=label)
plt.xlim(40, 80)
plt.xlabel('time from impact (ms)')
plt.ylabel('X acceleration (g)')
plt.title('Crossmember X acceleration at each J211 filter class, 40 to 80 ms', fontsize=10)
plt.legend(loc='lower right', fontsize=8)
plt.tight_layout()
plt.savefig('fig_classes.svg')
plt.close()

# Figure 3: one pass against two
plt.figure(figsize=(8, 3.6))
plt.plot(t, raw / G, color='lightgray', linewidth=0.7, label='as recorded')
plt.plot(t, one / G, linewidth=1.2, label='CFC 60, forward pass only')
plt.plot(t, y60 / G, linewidth=1.2, label='CFC 60, forward and backward')
plt.axvline(tp60, color='tab:orange', linestyle=':', linewidth=0.8)
plt.axvline(tp1, color='tab:blue', linestyle=':', linewidth=0.8)
plt.xlim(30, 90)
plt.ylim(-80, 30)
plt.xlabel('time from impact (ms)')
plt.ylabel('X acceleration (g)')
plt.title(f"CFC 60 run once peaks {tp1 - tp60:.2f} ms late (dotted lines mark the peaks)",
          fontsize=10)
plt.legend(loc='lower right', fontsize=8)
plt.tight_layout()
plt.savefig('fig_onepass.svg')
plt.close()
