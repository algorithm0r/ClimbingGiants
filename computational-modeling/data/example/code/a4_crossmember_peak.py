"""Assignment 4: the crossmember peak, filtered the way SAE J211 asks.

Run this from the unzipped pack folder. It finds the crossmember channel,
filters it at CFC 60 (forward, then backward), prints the peak, prints the
other numbers someone could get out of the same file, and saves the memo's
figure (crossmember_cfc60.svg).
"""
import json
import math
import os

import matplotlib.pyplot as plt

G = 9.81      # m/s^2 in one g
PACK = '.'    # the unzipped pack folder


def cfc_coefficients(cls, dt):
    """The five filter coefficients from SAE J211-1 (course notes, Smoothing)."""
    wd = 2 * math.pi * cls * 2.0775
    wa = math.tan(wd * dt / 2)
    d = 1 + math.sqrt(2) * wa + wa ** 2
    a0 = wa ** 2 / d
    b1 = -2 * (wa ** 2 - 1) / d
    b2 = (-1 + math.sqrt(2) * wa - wa ** 2) / d
    return a0, 2 * a0, a0, b1, b2


def one_pass(x, c):
    """Each output uses the inputs and the two outputs before it."""
    a0, a1, a2, b1, b2 = c
    out = [0.0] * len(x)
    for i in range(2, len(x)):
        out[i] = (a0 * x[i] + a1 * x[i - 1] + a2 * x[i - 2]
                  + b1 * out[i - 1] + b2 * out[i - 2])
    return out


def cfc(y, dt, cls):
    """Forward over the record, then backward over the result."""
    c = cfc_coefficients(cls, dt)
    return one_pass(one_pass(y, c)[::-1], c)[::-1]


def peak(t, y):
    """The sample with the largest size, whichever sign it has."""
    i = max(range(len(y)), key=lambda k: abs(y[k]))
    return y[i], t[i]


name = os.listdir(os.path.join(PACK, 'crash'))[0]
with open(os.path.join(PACK, 'crash', name)) as f:
    test = json.load(f)

# Alice's channel is the one whose header comment names the crossmember
key = [k for k, ch in test['channels'].items() if 'CROSSMEMBER' in ch['comment']][0]
ch = test['channels'][key]
dt = ch['dt']
t_ms = [1000 * (ch['t0'] + i * dt) for i in range(ch['n'])]
raw = ch['y']
print(f"test {test['testNo']}, channel '{key}': {ch['comment']} [{ch['code']}], "
      f"{ch['unit']}, {1 / dt:.0f} samples/s, prefilter {ch['prefilter_hz']} Hz")

# check: a constant has to come through the filter unchanged
a0, a1, a2, b1, b2 = cfc_coefficients(60, dt)
print(f"CFC 60 gain on a constant: {(a0 + a1 + a2) / (1 - b1 - b2):.6f}")

f60 = cfc(raw, dt, 60)
p, tp = peak(t_ms, f60)
print(f"CFC 60, forward and backward: {p:.1f} m/s^2 = {p / G:.1f} g at {tp:.2f} ms")

# other numbers that could come out of the same file
p_raw, tp_raw = peak(t_ms, raw)
print(f"as recorded (no CFC):         {p_raw:.1f} m/s^2 = {p_raw / G:.1f} g at {tp_raw:.2f} ms")
print(f"  that is {p_raw / p:.1f} times the CFC 60 peak")
p180, tp180 = peak(t_ms, cfc(raw, dt, 180))
print(f"CFC 180 (used to integrate):  {p180:.1f} m/s^2 = {p180 / G:.1f} g at {tp180:.2f} ms")
p1, tp1 = peak(t_ms, one_pass(raw, cfc_coefficients(60, dt)))
print(f"CFC 60, forward pass only:    {p1:.1f} m/s^2 = {p1 / G:.1f} g at {tp1:.2f} ms")

# the memo's figure: the channel as recorded and at CFC 60, in g
plt.figure(figsize=(8, 4))
plt.plot(t_ms, [v / G for v in raw], color='lightgray', linewidth=0.8, label='as recorded')
plt.plot(t_ms, [v / G for v in f60], linewidth=1.5, label='CFC 60, forward and backward')
plt.plot(tp_raw, p_raw / G, 'o', color='gray')
plt.annotate(f"{p_raw / G:.1f} g at {tp_raw:.1f} ms (unfiltered)", (tp_raw, p_raw / G),
             xytext=(10, 0), textcoords='offset points', fontsize=8)
plt.plot(tp, p / G, 'o', color='tab:blue')
plt.annotate(f"{p / G:.1f} g at {tp:.1f} ms (CFC 60)", (tp, p / G),
             xytext=(10, -12), textcoords='offset points', fontsize=8, color='tab:blue')
plt.xlim(-10, 160)
plt.xlabel('time from impact (ms)')
plt.ylabel('acceleration (g, 1 g = 9.81 m/s$^2$)')
plt.title(f"Test {test['testNo']}: left rear seat crossmember, X acceleration [{ch['code']}]",
          fontsize=10)
plt.legend(loc='upper right')
plt.tight_layout()
plt.savefig('crossmember_cfc60.svg')
