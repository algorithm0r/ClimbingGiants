"""Class 5: one whole program, read line by line.

Assignment 3 done the way SAE J211-1 asks: filter the crossmember channel at
CFC 180, then integrate it to get the car's velocity and the crush distance.

Run it from the unzipped pack folder (the folder that holds crash/):
    python class05_crush.py
"""

# ---- 1. Imports
import glob
import json

import numpy as np
import matplotlib.pyplot as plt


# ---- 2. Loading the file
name = glob.glob('crash/*.json')[0]   # every .json file in crash/, and [0] takes the first
with open(name) as f:
    test = json.load(f)               # the whole file, as a dictionary

print(test['testNo'], test['vehicle'])
print(test['test'])


# ---- 3. Searching the header
for key in test['channels']:
    ch = test['channels'][key]
    print(key, ch['code'], ch['comment'], ch['unit'])

key = None
for k in test['channels']:
    code = test['channels'][k]['code']
    if code.startswith('10'):
        key = k                       # vehicle 1, no seat: the car itself
ch = test['channels'][key]
print('the car:', key, ch['comment'])

dt = ch['dt']                         # seconds between samples
t = ch['t0'] + dt * np.arange(ch['n'])  # seconds from contact
ms = 1000 * t                         # the same times in ms
a = np.array(ch['y'])                 # acceleration in m/s^2
lab = test['test']['speed_kph'] / 3.6  # the lab's speed in m/s

print('channel', ch['code'], ch['n'], 'samples, dt =', dt)
print('lab speed', round(lab, 2), 'm/s')


# ---- 4. Plotting a channel
plt.figure(figsize=(8, 4))
plt.plot(ms, a, linewidth=0.7, label='as recorded')
plt.axvline(0, color='gray', linestyle='--')
plt.xlabel('time from contact (ms)')
plt.ylabel('acceleration (m/s$^2$)')
plt.title(ch['comment'])
plt.legend()
plt.tight_layout()
plt.show()


# ---- 5. Removing the offset
offset = np.mean(a[t < 0])            # mean acceleration before contact
a = a - offset
print('offset', round(offset, 3), 'm/s^2')


# ---- 6. Filtering at CFC 180
def cfc_coefficients(cfc, dt):
    wd = 2 * np.pi * cfc * 2.0775
    wa = np.tan(wd * dt / 2)
    d = 1 + np.sqrt(2) * wa + wa**2
    a0 = wa**2 / d
    a1 = 2 * a0
    a2 = a0
    b1 = -2 * (wa**2 - 1) / d
    b2 = (-1 + np.sqrt(2) * wa - wa**2) / d
    return a0, a1, a2, b1, b2


def one_pass(x, c):
    a0, a1, a2, b1, b2 = c
    y = np.zeros(len(x))
    x1 = x2 = y1 = y2 = 0.0           # nothing before the record
    for i in range(len(x)):
        y[i] = a0*x[i] + a1*x1 + a2*x2 + b1*y1 + b2*y2
        x2, x1 = x1, x[i]             # shift the inputs back one
        y2, y1 = y1, y[i]             # shift the outputs back one
    return y


def two_passes(x, c):
    forward = one_pass(x, c)
    return one_pass(forward[::-1], c)[::-1]   # backward, then flip


c = cfc_coefficients(180, dt)
af = two_passes(a, c)

ones = two_passes(np.ones(len(a)), c)
print('a constant comes back as', ones[1750])   # mid-record
print('peak before filtering', round(a.min(), 1), 'm/s^2')
print('peak at CFC 180', round(af.min(), 1), 'm/s^2')


# ---- 7. Integrating to velocity and crush
def running_integral(y, dt):
    panels = (y[1:] + y[:-1]) / 2 * dt    # one trapezoid per gap
    return np.concatenate([[0.0], np.cumsum(panels)])


def crush(acc):
    i0 = np.argmax(t >= 0)            # the first sample at contact
    dv = running_integral(acc, dt)
    dv = dv - dv[i0]                  # change since contact
    v = lab + dv                      # the lab's speed is the starting velocity
    stop = i0 + np.argmax(v[i0:] <= 0)  # the first sample stopped
    x = running_integral(v, dt)
    x = x - x[i0]                     # distance since contact
    return v, x, stop


v, x, stop = crush(af)
print('stopped at', round(ms[stop], 1), 'ms')
print('crush', round(1000 * x[stop], 1), 'mm')

v_r, x_r, stop_r = crush(a)
print('without the filter', round(1000 * x_r[stop_r], 1), 'mm')


# ---- 8. Plotting the answer
fig, (top, mid, bot) = plt.subplots(3, 1, sharex=True)
fig.set_size_inches(8, 8)
top.plot(ms, a, color='lightgray', label='offset removed')
top.plot(ms, af, label='CFC 180, two passes')
top.set_ylabel('acceleration (m/s$^2$)')
top.legend()
mid.plot(ms, v)
mid.plot(ms[stop], 0, 'o')
mid.axhline(0, color='gray', linewidth=0.8)
mid.set_ylabel('velocity (m/s)')
bot.plot(ms, 1000 * x)
bot.plot(ms[stop], 1000 * x[stop], 'o')
bot.set_ylabel('distance since contact (mm)')
bot.set_xlabel('time from contact (ms)')
bot.set_xlim(-10, 160)
bot.set_ylim(-100, 750)
fig.tight_layout()
plt.show()
