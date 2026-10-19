"""Assignment 2: what would a 1 kHz logger have read from crash test 10642?

Data phrase: lantern meadow quartz otter (crash test 10642).

Our logger recorded the test at 12,500 samples a second. A slower logger is
modelled by keeping only the samples it would have taken. Its first sample
could fall anywhere, so every possible start is tried and the lowest peak (the
worst start), the highest peak (the best start) and the start-0 peak are kept.

1 kHz does not divide 12.5 kHz (one 1 kHz interval is 12.5 of our samples), so
"keep every k-th sample" is generalised: the slower logger's j-th sample is
taken at position  start + j * ratio  in our samples, ratio = 12500 / rate, and
it is given the value of our sample at or just before that position. When the
ratio is a whole number k this is exactly keeping every k-th sample. When it
is not (10, 5, 2 and 1 kHz), each kept sample is at most one of our sample
intervals (0.08 ms) early, and the gaps alternate (12 and 13 samples at 1 kHz).
A second model, straight-line interpolation between our samples, is run at the
end as a check on that choice.

Run with Python 3 (numpy, matplotlib). It reads ../pack/crash/10642.json
relative to this file, prints every number in the report and saves
fig1_worst_peak_vs_rate.png, fig2_crossmember_1khz.png and
fig3_fine_sweep.png next to this file.
"""
import json
import os
from fractions import Fraction
from math import floor

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
TEST_FILE = os.path.join(HERE, '..', 'pack', 'crash', '10642.json')

G = 9.81            # m/s^2 in one g
KEEP = 0.95         # a rate passes if a peak keeps at least 95% at the worst start
PROPOSED = 1000     # Hz, the logger purchasing wants
RECOMMENDED = 6250  # Hz, the rate this report recommends (chosen from the output below)
# rates loggers are usually sold at (1-2-5 steps), and the rates that divide
# our 12,500 Hz exactly (the cases that need no model of where samples fall)
STEP_RATES = [10000, 5000, 2000, 1000, 500]
EXACT_RATES = [6250, 3125, 2500, 1250, 625, 250]
FINE_STEP = 250     # Hz, spacing of the fine sweep of rates
FINE_LOW = 500      # Hz, bottom of the fine sweep
INTERP_STEPS = 20   # start positions per one of our samples, interpolation check

# the dummy channels, and the one on the car's structure
DUMMY = ['head_x', 'head_y', 'head_z', 'chest_x', 'chest_d', 'pelvis_x', 'pass_head_x']
STRUCTURE = ['vehicle_x']
NAMES = {'head_x': 'driver head X', 'head_y': 'driver head Y', 'head_z': 'driver head Z',
         'chest_x': 'driver chest X', 'chest_d': 'driver chest deflection',
         'pelvis_x': 'driver pelvis X', 'vehicle_x': 'crossmember X (structure)',
         'pass_head_x': 'passenger head X'}


def load(path):
    with open(path) as f:
        return json.load(f)


def times(ch):
    return ch['t0'] + np.arange(ch['n']) * ch['dt']


def values(key, ch, remove_baseline=True):
    """The channel with its pre-impact mean removed, in g (mm for the deflection).

    The deflection header says m, but the values are micrometers (see Errors).
    """
    y = np.array(ch['y'], dtype=float)
    if remove_baseline:
        y = y - y[times(ch) < 0].mean()
    if key == 'chest_d':
        return y / 1000, 'mm'
    return y / G, 'g'


def peak(y):
    return float(np.max(np.abs(y)))


def kept_indices(n, ratio, start):
    """Indices of our samples a slower logger keeps.

    Its j-th sample sits at position start + j * ratio (in our samples) and takes
    our sample at or just before that position. ratio and start are Fractions,
    so the arithmetic is exact.
    """
    out = []
    j = 0
    while True:
        i = floor(start + j * ratio)
        if i >= n:
            return out
        out.append(i)
        j += 1


def peaks_by_start(y, rate_now, rate_new):
    """Peak of the slower record for every distinct starting position.

    With ratio = p/q in lowest terms there are p distinct starts, at m/q for
    m = 0 .. p-1 (for a whole-number ratio k these are samples 0 .. k-1).
    """
    ratio = Fraction(rate_now, rate_new)
    p, q = ratio.numerator, ratio.denominator
    return [peak(y[kept_indices(len(y), ratio, Fraction(m, q))]) for m in range(p)]


def peaks_by_start_interp(y, rate_now, rate_new, steps):
    """Same question, with the slower logger's value taken off a straight line
    between our two neighbouring samples. Starts every 1/steps of a sample."""
    ratio = rate_now / rate_new
    pos_all = np.arange(0, len(y) - 1, ratio)
    out = []
    for s in np.arange(0, ratio, 1 / steps):
        pos = pos_all + s
        pos = pos[pos <= len(y) - 1]
        out.append(peak(np.interp(pos, np.arange(len(y)), y)))
    return out


test = load(TEST_FILE)
channels = test['channels']
keys = list(channels)

# ---------------------------------------------------------------- the record
v, info = test['vehicle'], test['test']
print(f"Test {test['testNo']}: {v['year']} {v['make']} {v['model']}, {info['type']}, "
      f"speed in file: {info['speed_kph']}, angle in file: {info['angle']}")
dts = {ch['dt'] for ch in channels.values()}
ns = {ch['n'] for ch in channels.values()}
pre = {ch['prefilter_hz'] for ch in channels.values()}
t0s = {ch['t0'] for ch in channels.values()}
print(f"{len(keys)} channels; spacing {dts} s; samples {ns}; start {t0s} s; prefilter {pre} Hz")
ch0 = channels[keys[0]]
RATE_NOW = round(1 / ch0['dt'])
t_end = ch0['t0'] + (ch0['n'] - 1) * ch0['dt']
print(f"Recorded rate {RATE_NOW} Hz, one sample every {1000 * ch0['dt']:.3f} ms, "
      f"record from {1000 * ch0['t0']:.0f} to {1000 * t_end:.0f} ms")
print(f"Proposed {PROPOSED} Hz: one of its samples for every "
      f"{RATE_NOW / PROPOSED} of ours; recorded rate is {RATE_NOW / PROPOSED} times faster")

print(f"\n{'key':12} {'description':32} {'unit':8} {'baseline':>9} {'peak':>9} {'unit':4}"
      f" {'(m/s^2)':>9} {'at ms':>7} {'sign':>4} {'step':>6}")
full = {}
for key, ch in channels.items():
    y, unit = values(key, ch)
    raw = np.array(ch['y'], dtype=float)
    base = raw[times(ch) < 0].mean()
    i = int(np.argmax(np.abs(y)))
    full[key] = peak(y)
    step = np.min(np.diff(np.unique(raw)))           # smallest step between values
    si = full[key] * G if unit == 'g' else float('nan')
    print(f"{key:12} {ch['comment']:32} {ch['unit']:8} {base:9.3f} {full[key]:9.2f} {unit:4}"
          f" {si:9.1f} {1000 * times(ch)[i]:7.2f} {'-' if y[i] < 0 else '+':>4} {step:6.3f}")

# head Y peaks late in the record; where does the largest value fall in each part?
ch = channels['head_y']
y, _ = values('head_y', ch)
t = times(ch)
for lo, hi in ((0.0, 0.15), (0.15, t_end + 1e-9)):
    m = (t >= lo) & (t < hi)
    j = int(np.argmax(np.abs(y[m])))
    print(f"head_y largest |value| between {1000 * lo:.0f} and {1000 * min(hi, t_end):.0f} ms:"
          f" {y[m][j]:6.2f} g at {1000 * t[m][j]:.2f} ms")

# ------------------------------------------------- worst start at each rate
rates = sorted([RATE_NOW] + STEP_RATES + EXACT_RATES, reverse=True)
worst, best, start0 = {}, {}, {}
for key, ch in channels.items():
    y, _ = values(key, ch)
    worst[key], best[key], start0[key] = [], [], []
    for r in rates:
        p = peaks_by_start(y, RATE_NOW, r)
        worst[key].append(min(p) / full[key])
        best[key].append(max(p) / full[key])
        start0[key].append(p[0] / full[key])

print(f"\nWorst-start peak as % of the {RATE_NOW} Hz peak "
      f"('*' = rate divides {RATE_NOW} exactly)")
print(f"{'rate (Hz)':>9} {'starts':>6} " + ' '.join(f"{k:>11}" for k in keys))
for i, r in enumerate(rates):
    mark = '*' if RATE_NOW % r == 0 else ' '
    n_starts = Fraction(RATE_NOW, r).numerator
    print(f"{r:8d}{mark} {n_starts:6d} " + ' '.join(f"{100 * worst[k][i]:11.1f}" for k in keys))


def lowest_passing(rate_list, key_list):
    """Lowest rate in rate_list (fastest first) with every rate above it passing too."""
    lowest, failing_at = rate_list[0], None
    for r in rate_list:
        i = rates.index(r)
        bad = [k for k in key_list if worst[k][i] < KEEP]
        if bad:
            failing_at = (r, bad)
            break
        lowest = r
    return lowest, failing_at


for label, key_list in (('every channel', keys), ('dummy channels only', DUMMY)):
    for list_label, rate_list in (('1-2-5 rates', [RATE_NOW] + STEP_RATES),
                                  ('all rates tried', rates)):
        low, fail = lowest_passing(rate_list, key_list)
        msg = (f", first failure {fail[0]} Hz on "
               + ', '.join(f"{k} {100 * worst[k][rates.index(fail[0])]:.1f}%" for k in fail[1])
               if fail else '')
        print(f"{label:20} {list_label:16}: lowest passing {low} Hz{msg}")

# ------------------------------------- the proposed and recommended loggers
for r in (PROPOSED, RECOMMENDED):
    i = rates.index(r)
    n_starts = Fraction(RATE_NOW, r).numerator
    print(f"\nAt {r} Hz ({n_starts} distinct starts), peak in the channel's units:")
    print(f"{'key':12} {'12.5 kHz':>9} {'worst':>9} {'worst%':>7} {'lost':>8} {'best':>9}"
          f" {'start0':>9} {'unit':4}")
    for key, ch in channels.items():
        _, unit = values(key, ch)
        f = full[key]
        print(f"{key:12} {f:9.2f} {f * worst[key][i]:9.2f} {100 * worst[key][i]:6.1f}%"
              f" {f * (1 - worst[key][i]):8.2f} {f * best[key][i]:9.2f}"
              f" {f * start0[key][i]:9.2f} {unit:4}")

# the crossmember in m/s^2, to compare with the course notes' table for this channel
print("\nCrossmember X in m/s^2 (start 0 / worst / best):")
for r in (RATE_NOW, 3125, 1250, PROPOSED, 500, 250):
    i = rates.index(r)
    f = full['vehicle_x'] * G
    print(f"  {r:6d} Hz  {f * start0['vehicle_x'][i]:7.1f} {f * worst['vehicle_x'][i]:7.1f}"
          f" {f * best['vehicle_x'][i]:7.1f}")

# the samples around the crossmember peak, to see why the worst start loses what it does
y, _ = values('vehicle_x', channels['vehicle_x'])
i = int(np.argmax(np.abs(y)))
print("Crossmember samples around its peak (m/s^2):",
      ' '.join(f"{G * v:.0f}" for v in y[i - 4:i + 5]))
print(f"samples above 50% of the peak: {int(np.sum(np.abs(y) > 0.5 * full['vehicle_x']))}")

# -------------------------------------------- checks on the modelling choices
print("\nCheck 1: straight-line interpolation in place of 'sample at or before', "
      f"{INTERP_STEPS} starts per sample")
print(f"{'rate (Hz)':>9} " + ' '.join(f"{k:>11}" for k in keys))
for r in (10000, 5000, 2000, PROPOSED):
    row = []
    for key, ch in channels.items():
        y, _ = values(key, ch)
        row.append(min(peaks_by_start_interp(y, RATE_NOW, r, INTERP_STEPS)) / full[key])
    print(f"{r:9d} " + ' '.join(f"{100 * w:11.1f}" for w in row))

print("\nCheck 2: baseline left in, worst-start % at 1000 Hz")
for key, ch in channels.items():
    y, _ = values(key, ch, remove_baseline=False)
    p = peaks_by_start(y, RATE_NOW, PROPOSED)
    print(f"  {key:12} full {peak(y):9.2f}  worst {100 * min(p) / peak(y):5.1f}%")

# ------------------------------------- fine sweep of rates, every 250 Hz
fine = list(range(RATE_NOW, FINE_LOW - 1, -FINE_STEP))
fine_cross, fine_dummy, fine_dummy_key = [], [], []
y_cross, _ = values('vehicle_x', channels['vehicle_x'])
y_dummy = {k: values(k, channels[k])[0] for k in DUMMY}
for r in fine:
    fine_cross.append(min(peaks_by_start(y_cross, RATE_NOW, r)) / full['vehicle_x'])
    w = {k: min(peaks_by_start(y_dummy[k], RATE_NOW, r)) / full[k] for k in DUMMY}
    k_low = min(w, key=w.get)
    fine_dummy.append(w[k_low])
    fine_dummy_key.append(k_low)
below = [r for r, w in zip(fine, fine_cross) if w < KEEP]
print(f"\nFine sweep, {FINE_STEP} Hz steps from {RATE_NOW} to {FINE_LOW} Hz")
print(f"crossmember: fastest rate below {100 * KEEP:.0f}% is {max(below)} Hz; "
      f"rates from {min(r for r in fine if r > max(below))} Hz up all pass")
print(f"{'rate (Hz)':>9} {'crossmember %':>13} {'lowest dummy %':>14} channel")
for r, w, wd, kd in zip(fine, fine_cross, fine_dummy, fine_dummy_key):
    print(f"{r:9d} {100 * w:13.1f} {100 * wd:14.1f} {kd}")
below_d = [r for r, w in zip(fine, fine_dummy) if w < KEEP]
print(f"dummy: fastest rate below {100 * KEEP:.0f}% is {max(below_d)} Hz "
      f"({fine_dummy_key[fine.index(max(below_d))]}); lowest dummy at 1000 Hz "
      f"{100 * fine_dummy[fine.index(1000)]:.1f}% ({fine_dummy_key[fine.index(1000)]})")

# ------------------------------------------------------------------ figures
# Figure 1: worst-start peak against rate, every channel
plt.figure(figsize=(10, 5))
for key in DUMMY:
    plt.semilogx(rates, [100 * w for w in worst[key]], 'o-', markersize=4,
                 label=NAMES[key])
plt.semilogx(rates, [100 * w for w in worst['vehicle_x']], 's--', color='black',
             markersize=5, label=NAMES['vehicle_x'])
plt.axhline(100 * KEEP, color='gray', linestyle=':', linewidth=1,
            label='95% of the 12,500 Hz peak')
plt.axvline(PROPOSED, color='red', linewidth=1)
plt.text(PROPOSED * 1.04, 32, 'proposed\n1000 Hz', color='red', fontsize=8)
plt.axvline(RECOMMENDED, color='green', linewidth=1)
plt.text(RECOMMENDED * 0.66, 32, 'recom-\nmended\n6250 Hz', color='green', fontsize=8)
ticks = [250, 500, 1000, 2000, 5000, 6250, 10000, 12500]
plt.xticks(ticks, [f'{r:,}' for r in ticks], rotation=30)
plt.minorticks_off()
plt.ylim(20, 102)
plt.xlabel('sample rate of the slower logger (samples per second, log scale)')
plt.ylabel('worst-start peak (% of the 12,500 Hz peak)')
plt.title('Lowest peak a slower logger could read, each channel of test 10642', fontsize=10)
plt.legend(fontsize=8, loc='upper left', bbox_to_anchor=(1.01, 1))
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(HERE, 'fig1_worst_peak_vs_rate.png'), dpi=150)
plt.close()

# Figure 2: the crossmember around its peak, and the 1 kHz samples from the
# best and worst starts
ch = channels['vehicle_x']
y, _ = values('vehicle_x', ch)
t_ms = 1000 * times(ch)
p = peaks_by_start(y, RATE_NOW, PROPOSED)
ratio = Fraction(RATE_NOW, PROPOSED)
plt.figure(figsize=(8, 4.5))
win = (t_ms >= 0) & (t_ms <= 30)
plt.plot(t_ms[win], y[win], color='gray', linewidth=1, label='recorded, 12,500 Hz')
for m, mark, name in ((int(np.argmax(p)), 'o', 'best'), (int(np.argmin(p)), 's', 'worst')):
    idx = np.array(kept_indices(len(y), ratio, Fraction(m, ratio.denominator)))
    idx = idx[win[idx]]
    plt.plot(t_ms[idx], y[idx], mark + '-', markersize=5, linewidth=0.8,
             label=f'1000 Hz, {name} start (peak over whole record {p[m]:.1f} g)')
plt.xlabel('time from impact (ms)')
plt.ylabel('acceleration (g)')
plt.title('Left rear crossmember X [' + ch['code'] + '], 0 to 30 ms, test 10642',
          fontsize=10)
plt.legend(fontsize=8, loc='lower right')
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(HERE, 'fig2_crossmember_1khz.png'), dpi=150)
plt.close()

# Figure 3: fine sweep, crossmember and the lowest dummy channel at each rate
plt.figure(figsize=(8, 4.5))
plt.plot(fine, [100 * w for w in fine_cross], '.-', color='black',
         label='crossmember X (structure)')
plt.plot(fine, [100 * w for w in fine_dummy], '.-', color='tab:blue',
         label='lowest of the seven dummy channels')
plt.axhline(100 * KEEP, color='gray', linestyle=':', linewidth=1,
            label='95% of the 12,500 Hz peak')
plt.axvline(PROPOSED, color='red', linewidth=1)
plt.text(PROPOSED + 100, 32, 'proposed 1000 Hz', color='red', fontsize=8)
plt.axvline(RECOMMENDED, color='green', linewidth=1)
plt.text(RECOMMENDED + 100, 32, 'recommended 6250 Hz', color='green', fontsize=8)
plt.xlim(0, 13000)
plt.ylim(20, 102)
plt.xlabel(f'sample rate of the slower logger (samples per second, every {FINE_STEP})')
plt.ylabel('worst-start peak (% of the 12,500 Hz peak)')
plt.title('Worst-start peak at every rate from 500 to 12,500 Hz, test 10642', fontsize=10)
plt.legend(fontsize=8, loc='center right')
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(HERE, 'fig3_fine_sweep.png'), dpi=150)
plt.close()
print('\nSaved fig1_worst_peak_vs_rate.png, fig2_crossmember_1khz.png, fig3_fine_sweep.png')
