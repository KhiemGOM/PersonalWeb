# Blog research dossier: Air Potential vs. the alternatives

Everything from a Claude Code investigation session, written so a fresh agent
(or a person) can write the blog post from this alone, with no access to the
original session. Project: `mc-pathfind` (a Minecraft route-planning
research project, Python + Java, weighted A*), specifically the Java `core` module's
`AirPotential`/`AirPotentialField` heuristic used by the real, live-tested
Nether bastion pathfinder for the agent.

**The post is explicitly NOT about A\* itself**, that's implementation
detail. It's about one specific heuristic decision: how do you decide which
MINE (dig-through-a-block) candidates are worth generating at all, out of
the huge number theoretically available at every search node.

---

## 1. The problem being solved

`WeightedAStar`'s search generates a MINE candidate for basically every
adjacent solid block. On a real 368x128x368 Nether region
(`k2_r_0_0`, one of the project's benchmark regions), that's **2.39 million
MINE candidates per search**, of which only **11.3% ever actually improve a
gScore** (i.e., ever matter). Most digs go nowhere useful, the wall is thick,
or the space behind it is already reachable some other way. Pruning the
useless 88.7% without accidentally pruning the useful 11.3% is the actual
engineering problem.

## 2. Air Potential: what it is and its own documented history

`AirPotentialField` does a one-time, per-search precompute: a BFS over pure
air-connectivity (ignores walkability rules, just "is there an unbroken
chain of non-solid voxels"), seeded at the search's start, coarsened to
4x4x4-block chunks for speed. `AirPotential.potential()` combines two
signals:
- `f(delta)`: how much farther (in chunk-BFS hops) the MINE *target* is from
  start than the *current* position is a cheap proxy for "this leads
  somewhere I haven't reached yet" (novelty), not just "this is nearby."
- `g(dist)`: inverse-square of Euclidean distance, a thin wall counts, a
  long tunnel doesn't.

A MINE candidate is hard-pruned if `potential < MINE_PRUNE_THRESHOLD (0.02)`.

### 2.1 The exact formula

Let \(D_s(x)\) be the chunk-BFS hop distance from the search's start to
voxel \(x\) (via `AirPotentialField`; \(D_s(x) = \text{UNREACHED}\) if the
BFS never visited that chunk). For current position \(u\) and MINE target
\(v\):

\[
\Delta = D_s(v) - D_s(u)
\]

\[
P(u,v) =
\begin{cases}
0, & D_s(u) \text{ or } D_s(v) \text{ is UNREACHED, or } \Delta \le c \\[6pt]
\left(1 - e^{-(\Delta-c)/s}\right) \cdot \dfrac{1}{\lVert v-u \rVert_2^2}, & \Delta > c
\end{cases}
\]

**Prune the MINE candidate if \(P(u,v) < \tau\).**

Live constants: \(c = \texttt{OLD\_GROUND\_CUTOFF} = -1\),
\(s = \texttt{scaleBfs} = 3.0\), \(\tau = \texttt{MINE\_PRUNE\_THRESHOLD} = 0.02\).
This matches `AirPotential.potential()`/`shouldPruneMine()` in the source
exactly (`java/core/src/main/java/dev/mcpathfind/core/AirPotential.java`).

### 2.2 The core intuition: why this specific combination, not either term alone

(This is the actual design reasoning behind the formula, not just a
restatement of what it computes, worth including as its own explanatory
passage in the post, not just the math.)

- **The inverse-square term alone is an ordinary physical-style potential.**
  The closer a candidate block is to open air, the more it "looks like a
  surface", the same way a field's potential rises near its source. On its
  own this term just says "prefer digging where air is nearby," which
  isn't very discriminating.
- **The BFS-delta term's real job is to suppress that surface-ness signal
  specifically for air that's already walk-reachable nearby.** If \(\Delta\)
  is small (the target's chunk is barely any farther from start, in BFS
  hops, than the current position's chunk is), the exponential factor
  collapses toward 0 regardless of how physically close the air is. What
  survives, what actually registers as potential, is air that is
  Euclidean-*near* but BFS-*far*: physically adjacent, yet topologically
  distant from anywhere already reachable by walking. That specific
  combination is the signature of "the other side of a wall": a pocket of
  air you haven't reached yet, not air you're already standing in or next
  to.
- **This is what lets one formula distinguish a thin wall from a thick one,
  without ever directly measuring wall thickness.** A thin wall puts
  genuinely new (BFS-far) air right next door (Euclidean-near), both
  factors fire, potential is high. A thick wall either puts that same new
  air too far away for the inverse-square term to register, or the interior
  of a thick mass never gets touched by the start-seeded air BFS at all
  (stays UNREACHED, chunk-occupancy adjacency can't cross solid rock),
  which the formula treats as zero potential by construction, not as an
  edge case needing special handling.
- **One natural objection**: the actual call site compares the current
  position \(u\) to the *immediately adjacent* MINE target \(v\)
  (`shouldPruneMine(threshold, x, y, z, nx, y, nz)`), so
  \(\lVert v-u\rVert_2^2\) is always the same small constant (1 or 2) for
  the *first* cardinal dig into a wall, whether that wall is 1 block or 8
  blocks thick, the raw distance term by itself doesn't see the
  difference on a single step. The resolution is that the distinguishing
  signal lives in \(\Delta\), not in the per-step distance term: a target
  voxel one step into a genuinely thin wall is often already BFS-close to
  air on the far side (small chunk-hop count once the thin chunk itself
  registers as "has air" via `chunkContainsAir`), producing a real
  \(\Delta\); a target one step into a thick mass has no such nearby BFS
  signal to inherit, so \(\Delta\) stays small or the chunk is UNREACHED.
  The Euclidean term still does real work (it's what makes *distant* new
  air worth less than *adjacent* new air), it just isn't the term doing
  the thickness discrimination on its own; that's the BFS delta's job,
  operating on the chunk (not the exact voxel), which is coarser but
  cheap.
- **Why BFS-over-air-connectivity is a legitimate proxy for real movement
  cost at all, not just a convenient shortcut**: every action in this
  solver's repertoire except MINE is fundamentally "hopping through
  existing air", SPRINT, CLIMB, FALL, BOAT_CRAWL, and PARKOUR all move
  through space that's already open, and even BRIDGE (which costs
  somewhat more than a pure air-hop, since it consumes a placed block and
  carries a risk tax) is close to one. So BFS hop-distance through air
  really is a cheap, reasonably faithful stand-in for "how far would this
  actually take to reach via normal movement", exactly the baseline the
  Euclidean dig-shortcut comparison needs to be measured against. MINE is
  the one action that changes what's reachable at all, which is why it's
  the one action this whole heuristic exists to gate.

**The class's own javadoc documents three iterations**, which is itself
great blog material:
1. **Soft discount** on good candidates: measured effect ~none (MINE's
   improve-rate moved 11.3%→11.5%), it left the common (wasteful) case
   completely untouched, only sweetened the rare good ones.
2. **Soft penalty** (expensive by default, relieved when potential is high):
   cut MINE candidate volume ~10%, expansions ~8%, but wall-clock got
   *worse* (~3.0s→3.6s) because the penalty's own per-candidate overhead
   outweighed the savings. The metric ("fewer expansions") hid a real
   regression on the metric that actually matters (wall-clock).
3. **Hard prune** (what's live today): MINE candidates 2.39M→121K (**-95%**),
   improve-rate nearly doubled (11.3%→19.3%), expansions AND wall-clock both
   dropped below the pre-AirPotential baseline. Accepted tradeoff, confirmed
   on a different region (`k1_r_0_0`): the prune can skip a MINE step that
   was genuinely optimal, degrading that region's path from cost 21.48 to
   26.07 (still valid, just not cheapest).

Source file: `java/core/src/main/java/dev/mcpathfind/core/AirPotential.java`
and `AirPotentialField.java`.

## 3. Alternatives tested (all real production code, not reimplementations)

The live solver (`dev.mcpathfind.core.WeightedAStar`) has a static toggle,
`MinePruneMode { NONE, AIR_POTENTIAL, MANHATTAN, NEAREST_AIR, HYBRID }`,
built for exactly this kind of A/B testing, every arm below runs through
the *actual* shipped search code, not a separate harness.

- **NONE**: no pruning at all. Uninformed baseline / ground truth reference.
- **MANHATTAN**: prune a MINE candidate unless it strictly decreases
  Manhattan distance to the goal. The "obvious first idea." Already existed
  in the codebase (`EdgeRules.mineMovesCloserToGoal`) before this session.
- **NEAREST_AIR** *(built this session)*: prune unless open space is within
  a fixed radius, straight-line, of the dig target, no connectivity
  awareness at all (doesn't check if that nearby air is actually reachable
  by digging there). See §5 for the implementation and a real degeneracy
  bug that had to be fixed before it meant anything.
- **HYBRID** *(built this session)*: switch between AIR_POTENTIAL (cheap) and
  NEAREST_AIR (safe) based on local stone-block density, see §7. Attempted
  fix, didn't pan out, but the reason why is itself a good finding.

## 4. Test corpus: 20 real Nether Bastion Remnant regions

**All real terrain, not synthetic.** Confirmed via
`mca_convert.py`'s block-mapping comment, which explicitly calls
blackstone/basalt "wall-like (**bastion remnant material**)".

- **12 bundled regions** already in the project (`k1`, `k2`, `long1`, 4
  each), used throughout the project's own development history.
- **8 more exported from my own Minecraft save files**
  (`.../saves/<world>/DIM-1/region/*.mca`),
  gathered and filtered mid-session:
  - Surveyed 20 real `.mca` candidates across 6 different worlds.
  - **Rejection criterion**: size of the largest walk-reachable connected
    component (via `reachability.largest_walkable_component`). Regions
    under ~4,000 walkable cells were rejected as "too small", several
    were literally near-empty (one had only 128 walkable cells).
  - Discovered two of the save folders (`dTP0SNSDT` and `e14rrv5et`) are
    the same underlying terrain (same walkable-component size and
    auto-picked start/goal down to the coordinate, despite non-identical
    file bytes, almost certainly the same world seed generated twice).
    Treated as one region, not two, to avoid double-counting.
  - **8 accepted** (11K-43K walkable cells each, comparable to or bigger
    than several already-bundled regions): `1uIGhtjEX_r_neg1_0` (11,030),
    `1uIGhtjEX_r_0_0` (43,403, the biggest in the whole corpus),
    `a6A6Hpahj_r_neg1_0` (16,520), `a6A6Hpahj_r_0_0` (18,124),
    `BX7TX6pyc_r_0_0` (24,269), `BX7TX6pyc_r_neg1_0` (10,381),
    `dTP0SNSDT_r_0_neg1` (16,816), `CZIDc4D02_r_0_0` (10,866).
  - Start/goal per region: auto-picked via `_find_region_route`, the two
    points maximally far apart by actual walked hop-count (double-sweep
    BFS) within the largest connected component, not an arbitrary pair.

**Total: 20 regions x 2 epsilons (1.5 practical, 1.0 true-optimal) x 5
modes = 200 runs.** All `found=true`, all `PathValidator: OK`, no DNFs,
no invalid paths, nothing hit the 20M-expansion budget.

## 5. Results: walk-diameter routes (the general terrain test)

Aggregated across all 40 region/epsilon pairs, relative to NONE:

| Mode | avg expansions vs NONE | avg cost vs NONE | # regions worse on cost | # regions worse on expansions |
|---|---|---|---|---|
| AIR_POTENTIAL | -5.32% | +0.072% | 4 | 1 |
| **NEAREST_AIR** | -3.09% | **0.000%** | **0** | **0** |
| MANHATTAN | -0.46% | +0.592% | 7 | 5 |
| HYBRID | -5.20% | +0.072% | 4 (identical set to AIR_POTENTIAL) | 1 (same) |

**AIR_POTENTIAL's worst case**: `1uIGhtjEX_r_0_0` (+0.6-0.9% cost, +3.1%
expansions at eps 1.5, the first time it was measured *slower* than doing
no pruning at all) and `k1_r_0_neg1` (+0.65-0.85% cost).

**MANHATTAN's worst case**: `long1_r_0_0` at eps=1.0, **+90.8% expansions**
and +5.3% worse cost simultaneously. The "obvious" heuristic isn't just
occasionally suboptimal, it can be actively counterproductive: worse than
doing nothing on both axes at once. Mechanism: a strict "only mine if
Manhattan-closer to goal" rule can outlaw a genuinely useful sideways/
backward dig, forcing a costlier detour that also takes more search to find.

**Wall-clock per expansion** (21 regions with >=50K expansions, to cut
noise from tiny/fast ones):

| Mode | avg us/expansion |
|---|---|
| NONE | 3.933 |
| AIR_POTENTIAL | 3.731 (fastest, O(1) lookup into a once-built field) |
| MANHATTAN | 3.734 |
| **NEAREST_AIR** | **4.636** (slowest, O(radius^3) scan per candidate, no precompute) |
| HYBRID | 4.219 (between the two, see §7, the gate mechanism works even though detection doesn't) |

## 6. Results: the realistic use case, approach + enter a bastion

The walk-diameter routes above are a general robustness test, but they're
**not what the agent actually needs to do**. The real task: locate a
bastion, approach from roughly 12-15 chunks (192-240 blocks) away, and
get to/through the bastion's outer wall. Two purpose-built scenarios were
constructed on the biggest region (`1uIGhtjEX_r_0_0`, 272x128x368):

**Bastion located via stone-density scan** (STONE = blackstone/basalt
family in this project's block scheme, distinct from DIRT = netherrack;
see §7 for why this distinction matters): a 16-block windowed density scan
found the true bastion centroid at (57,37,136) with **peak density 0.99**
(natural Nether terrain never reaches this, a clean signal). Only 1 of 4
candidate regions surveyed this way produced a confident detection within
the auto-exported chunk window; the other 3 likely have their bastion
outside that window, not necessarily absent from the file.

### 6a. First attempt (flawed): deep interior navigation

Goal picked as the most-enclosed air pocket near the density peak, i.e.,
"solve the sealed room," not "get to the doorstep." **This is NOT
representative of the real use case** (confirmed by the person this was
built for), kept as a data point since it's still informative, but don't
present it as "the" realistic test.

Start=(22,78,329), Goal=(57,41,140), 192 blocks apart.

At eps=1.0 (the decisive pass):

| Mode | cost | expansions | wall-clock |
|---|---|---|---|
| NONE | 74.24 | 15.63M | ~77-82s |
| **AIR_POTENTIAL** | **75.07 (+1.1%)** | **16.63M (+6.4%)** | slower than NONE too |
| MANHATTAN | 74.77 (+0.7%) | 15.97M (+2.2%) | not reported |
| NEAREST_AIR | **74.24 (tied, optimal)** | **15.48M (best)** | slowest (per usual) |
| HYBRID | 75.07 (same as AIR_POTENTIAL, unchanged) | 16.64M (same) | between the two |

**Air Potential is dominated on all three axes at once here**, the only
time in the whole investigation that happened. Mechanism hypothesis (not
fully proven, but consistent with the density-gate diagnosis in §7):
`AirPotential`'s signal is chunk-BFS distance *from the player's current
position*. Once you're near/inside a compact structure, nearly everything
is chunk-BFS-close to wherever you're standing, so the "is this genuinely a
different unexplored pocket" signal that works on long open-terrain digs
may simply run out of dynamic range in a small enclosed space, the
opposite regime from what its constants (`OLD_GROUND_CUTOFF=-1`,
`scaleBfs=3.0`) were tuned against (`k2_r_0_0`, a long open-terrain route).

### 6b. Corrected scenario: perimeter approach (the actual use case)

Goal moved to just past the outer wall along the straight-line approach
vector from start toward the bastion, found by walking that line and
detecting where local stone-density first crosses 0.35 (t=0.895 of the way,
i.e., **89.5% of the route is open terrain**, only the last stretch
requires breaching a wall). Start=(22,78,329) unchanged,
Goal=(55,43,153) (vs. the flawed attempt's (57,41,140), shallower, not
a sealed room).

At eps=1.0:

| Mode | cost | expansions | wall-clock |
|---|---|---|---|
| NONE | 57.67 | 1.655M | 6116ms |
| AIR_POTENTIAL | 57.67 (tied) | 1.625M (-1.8%) | 5849ms |
| **MANHATTAN** | 57.67 (tied) | **1.607M (-2.9%, best)** | **5479ms (fastest)** |
| NEAREST_AIR | 57.67 (tied) | 1.646M (-0.5%) | 7213ms (slowest) |
| HYBRID | 57.67 (tied) | 1.625M (same as AIR_POTENTIAL) | 6354ms (between) |

**All five modes tie exactly on cost.** With ~90% open terrain and one
wall crossing, there isn't enough MINE complexity for any heuristic to
make a costly wrong call, the differences are purely search speed, and
**Manhattan actually wins this one** (cheapest check, and its failure mode
never gets exercised on a mostly-straight approach).

## 7. The hybrid attempt: sound mechanism, wrong signal

**Idea** (came from the person mid-session, after seeing the tradeoff
above): gate `NEAREST_AIR`'s expensive per-candidate check behind a cheap,
precomputed density signal, use `AIR_POTENTIAL`'s O(1) lookup by default,
only pay `NEAREST_AIR`'s O(radius^3) cost where local block density says
you're actually near a real structure.

**Implementation** (`StoneDensityField.java` + a new branch in
`EdgeRules.horizontalEdges`): chunk-coarsened (same CHUNK=4 as
`AirPotentialField`) precompute of **STONE-specific** density, deliberately
NOT generic `isSolid()` density. Ordinary Nether terrain (netherrack
floors/ceilings/cave walls, all DIRT-mapped) is locally solid almost
everywhere, so a generic solid-density signal would fire constantly and
carry no information. STONE = blackstone/basalt family specifically means
"real structure," not "any terrain." At or above
`HYBRID_STONE_DENSITY_THRESHOLD=0.35`, use `NearestAirDistance`; below it,
use `AirPotential`.

**Result: it barely moved anything.** On every scenario tested, `HYBRID`'s
cost and expansions were nearly identical to pure `AIR_POTENTIAL`
(including reproducing its exact 4 failure regions from §5 unchanged), even
on the perimeter scenario that's specifically a wall crossing.

**Diagnosed why** (verified with a density histogram + goal-point sampling,
not just theorized): querying the field confirmed density reads correctly
high near the goal (0.844 at the interior goal, 94.4% of nearby samples
cross threshold), the field itself works. But a genuinely **thin,
crossable wall has open space on both sides by definition**, a 4x4x4
chunk straddling a 1-2 block wall with rooms on either side averages out
to maybe 20-30% density, *under* the threshold. The gate correctly flags
"deep inside a solid mass of rock" (where the prune decision barely
matters, nobody's digging through 10 blocks of solid blackstone either
way) but misses exactly the borderline "thin wall, worth digging" case that
determines path cost, which is precisely the case `AirPotential` itself
was built to detect via its `g(dist)=1/dist^2` term.

**The mechanism half genuinely worked, though**: average wall-clock
(4.22 us/expansion) sits between `AIR_POTENTIAL` (3.73) and `NEAREST_AIR`
(4.64), proof the gate pays the expensive check proportionally to how
often it actually fires (rarely, ~1.3% of the world crosses 0.35), not
uniformly. The pattern (precompute a cheap signal, gate an expensive check
behind it) is validated; the specific signal (density-as-mass) is wrong for
this specific job. A fixed version would need to measure *thinness*
(e.g., a ring/shell sample excluding the target's immediate neighborhood)
rather than *mass* (a solid box centered on the target), not attempted
this session, flagged as the natural next step.

## 8. "Industry SOTA" comparison: Baritone

Researched via the actual Baritone source (`cabaletta/baritone` on GitHub),
not from memory, cite these directly:
- https://github.com/cabaletta/baritone
- https://github.com/cabaletta/baritone/blob/master/FEATURES.md
- https://github.com/cabaletta/baritone/blob/master/src/main/java/baritone/pathing/movement/MovementHelper.java

Baritone's mining-cost function (`getMiningDurationTicks`) is **purely
block-property-based**: tool effectiveness (`toolSet.getStrVsBlock`),
falling-block chains, liquid-safety avoidance (won't break blocks touching
liquid). **No spatial/connectivity/novelty heuristic at all**, each block
is costed independently, confirmed directly from source, not inferred.

It doesn't need one, because its search is bounded a different way:
segmented A* that exits early at the edge of *loaded* chunks or on
timeout, operating over a 2-bit-per-voxel cache of only currently-loaded
terrain (AIR/SOLID/WATER/AVOID), bounded by render distance, not a full
pre-snapshotted region. The MINE-candidate explosion Air Potential exists
to fix (2.39M candidates on one 368x128x368 *offline* snapshot) is a
problem specific to batch-planning over a large pre-loaded region,
Baritone mostly sidesteps it by never holding that much unexplored terrain
in its search space at once.

**Framing for the post**: not "we beat industry SOTA" (inaccurate, unfair
comparison, different problem shapes) but "the two solve differently-
shaped problems, and Air Potential exists specifically because this
project made the batch/offline-planning tradeoff Baritone didn't."

## 9. Final synthesis / thesis

**Air Potential and Nearest Air are not both simply "winners", they win on
different axes of a real tradeoff, and neither dominates the other:**

- **AIR_POTENTIAL**: best average case (biggest expansion reduction,
  cheapest per-candidate cost via one-time precompute) but not perfect,
  4-5 real regions (out of 20 tested) where it costs a small amount of path
  quality, one region where it's even slower than no pruning at all.
- **NEAREST_AIR**: perfect safety record, 0 regressions across every one
  of 44 total test pairs run this session, at a real, consistent cost:
  ~20% more wall-clock per expansion, because it has no precompute.
- **MANHATTAN**: the control-group failure. Worst average performer, most
  frequent and most severe failures (up to +90.8% expansions on one real
  region), sometimes worse than doing nothing on both axes simultaneously.
  Exists in the post to show *why* a heuristic is needed at all, the
  "obvious" idea genuinely doesn't work.
- **HYBRID**: the attempt to get both wins at once. Proved the *mechanism*
  (gate an expensive check behind a cheap precomputed signal) works as
  designed, but used the wrong signal (mass instead of thinness), so it
  degenerates to `AIR_POTENTIAL` almost everywhere, reproducing its
  failures unchanged. A real, honest negative result with a clear,
  verified mechanistic explanation, not "we ran out of time," an actual
  diagnosed reason, with a stated fix that wasn't attempted.

**Recommended framing**: trading a small chance of a bad call for better
average speed (`AIR_POTENTIAL`) vs. paying a fixed cost for a correctness
guarantee (`NEAREST_AIR`) is a legitimate, general design tradeoff, not a
contest with one right answer. That's a stronger, more defensible post
thesis than declaring a single winner, and it's backed by 44 independently
reproducible test pairs across 20 regions (12 original + 8 from my own
generated Minecraft saves) plus 2 purpose-built realistic scenarios, not a
handful of cherry-picked numbers.

## 10. Honesty notes to state explicitly in the post, not bury

1. One fixed (start, goal) per walk-diameter region, 20 real routes, not
   20 independent random samples of "bastion terrain in general."
2. `NEAREST_AIR_PRUNE_RADIUS=3` and `HYBRID_STONE_DENSITY_THRESHOLD=0.35`
   both came from light sweeps (2 regions, a handful of values), not the
   kind of real tuning `AirPotential`'s own constants got historically.
3. The Baritone section is structural/qualitative (verified from real
   source, correctly cited), not a head-to-head benchmark run against it.
4. The deep-interior scenario (§6a) is real data but explicitly NOT
   representative of the actual use case, present it as an interesting
   edge case, not the headline result.
5. No automated test suite exists for any of this (`core/src/test` is an
   empty scaffold), the validation story is `PathValidator` (an
   independent per-path re-checker, ran on every single result above, zero
   violations) plus these ad-hoc harnesses, not CI.

## 11. Suggested blog structure

Two viable shapes, pick one:

**A. Single post**: "We built a heuristic, and here's exactly how far we
got trying to make it perfect", Air Potential's own 3-iteration history
(§2) as the opening act, then the alternatives/comparison (§5-6) as the
rigorous validation, then the hybrid attempt (§7) as the "and here's where
we hit a real wall" closer. Baritone (§8) as a sidebar/callout box.

**B. Two posts**: this one (Air Potential + the heuristic comparison +
hybrid attempt), and a separate one later about the Pearl trajectory
solver (explicitly out of scope for this post, different engineering
problem, deferred by the person mid-session, not covered in this dossier
at all).

## 12. Code appendix: the pieces most worth showing in the post

**The MINE-prune decision chain** (`EdgeRules.java`, the actual shape of
the A/B toggle):
```java
if (BlockType.isSolid(target)) {
    if (unbreakable...) {
        // no-op
    } else if (airPotential != null && airPotential.shouldPruneMine(...)) {
        // AIR_POTENTIAL prune
    } else if (manhattanPruneEnabled && !mineMovesCloserToGoal(...)) {
        // MANHATTAN prune
    } else if (nearestAirPruneEnabled && NearestAirDistance.shouldPrune(...)) {
        // NEAREST_AIR prune
    } else if (hybridDensityField != null && (density >= THRESHOLD
            ? NearestAirDistance.shouldPrune(...)
            : hybridAirPotential.shouldPruneMine(...))) {
        // HYBRID prune
    } else {
        // survives -- compute real cost, emit the edge
    }
}
```

**NearestAirDistance's degeneracy bug and fix** (genuinely good blog
material on its own, "the naive idea doesn't even compile into something
meaningful without this one fix"): every MINE target is by construction
exactly one step from the player's own current (always-open) position, so
a naive "distance to nearest air" scan would immediately find that cell
and always return 1, telling you nothing. Fix: exclude the known source
cell from the scan explicitly.

**Full source files, all in `java/core/src/main/java/dev/mcpathfind/core/`
(repo root: `mc_pathfind`, currently uncommitted in git as of this
session):**
- `AirPotential.java`, `AirPotentialField.java` (pre-existing, the subject)
- `NearestAirDistance.java` (new this session)
- `StoneDensityField.java` (new this session)
- Modified: `EdgeRules.java`, `WeightedAStar.java` (added `NEAREST_AIR` and
  `HYBRID` arms, backward-compatible, old call sites unaffected)

**Test harness** (also uncommitted): `experiments/MineHeuristicShowdown.java`,
loads every `.wbin` in a directory, runs all `WeightedAStar.MinePruneMode`
values at both epsilons, validates every result with `PathValidator`,
prints CSV. This is what produced every number in this dossier; point the
web agent at it (plus the `.wbin` region files) to regenerate or extend
any of these tables.

## 13. Core world & action model: the "obviously correct" foundation

Everything in §2-§12 is about ONE decision (should this specific MINE
candidate be generated at all). This section is the rest of the model, the
part that isn't in question, that every prune arm sits on top of unchanged.
Source of truth is `pathfind.py` (the original, most heavily-commented
version, at the repo root), the Java port (`java/core/.../EdgeRules.java`,
`WeightedAStar.java`) is a faithful line-for-line port of this same model,
just restructured for speed (dense state ids, a decrease-key heap, see
`experiments/SESSION_LOG.md` for that optimization history, unrelated to
anything in this dossier).

### 13.1 World representation

A Minecraft region becomes a flat 3D voxel array, `world[x][y][z]` = block
type code, `y` vertical (up = +y). Five block types matter to the solver
(`world.py`):

```python
AIR = 0
DIRT = 1       # fast to mine -- also where real Nether terrain
               # (netherrack, soul sand, etc.) gets mapped, see mca_convert.py
STONE = 2      # slow to mine, needs pickaxe -- also where real bastion
               # material (blackstone/basalt family) gets mapped
OBSIDIAN = 3   # very slow, needs diamond pickaxe
BEDROCK = 4    # unbreakable (world border / bedrock layer / barrier blocks)
LAVA = 5       # impassable but NOT solid: can't stand in or walk through it,
               # can't be mined (nothing to mine, it's a fluid), but CAN be
               # bridged over (place a block on top). Falling into it is the
               # one death outcome nothing else in this model has.
VOID = -1      # out of bounds / no block (world edge, ravines)

MINE_TIME = {DIRT: 0.3, STONE: 1.2, OBSIDIAN: 9.0}  # base seconds/block, hand-tuned
UNBREAKABLE = {BEDROCK}

is_solid(block)      = block in (DIRT, STONE, OBSIDIAN, BEDROCK)
is_lava(block)        = block == LAVA
is_unbreakable(block) = block in UNBREAKABLE
is_void(block)         = block == -1
```
Real `.mca` region files get converted into this same 6-value scheme by
`mca_convert.py`'s block-type mapping table (netherrack/soul sand -> DIRT,
blackstone/basalt/ores -> STONE, obsidian/ancient debris -> OBSIDIAN,
bedrock and lava handled specially), this is exactly the mapping that
makes `StoneDensityField` (§14.3) able to tell "real bastion wall" (STONE)
apart from "ordinary Nether terrain" (DIRT) at all.

### 13.2 State representation

`state = (x, y, z, blocks_remaining, crawling)`. `blocks_remaining` tracks
the BRIDGE resource budget (starts at `blocks_available`, decrements per
placement). `crawling` is a 0/1 flag for whether the agent is mid a
boat-crawl sequence, tracked in state (not just inferred from the move)
specifically because the crawl technique's startup tax should fire once
per sequence, not once per block; the flag is how the cost function knows
whether it's continuing an existing crawl or starting a fresh one. The Java
port packs this same 5-tuple into a single `long` (`StateCodec.pack`/
`unpack*`) for O(1) hashing/array-indexing instead of Python's tuple
hashing, a performance detail, not a modeling difference.

### 13.3 The action set and exact cost formulas

Every action below is a candidate edge in the search graph, yielded per
step from the current state. Costs are simulated seconds. All constants
are hand-tuned (not measured from real gameplay, an explicitly stated
simplification in the project's own README), but the *shape* of each
formula (what varies, what's flat, what interacts) is the part actually
being claimed as a faithful model.

**SPRINT**, walking onto/through an air voxel with solid, non-lava
support below, head and feet both clear:
```
cost = dist / SPRINT_SPEED          # SPRINT_SPEED = 5.6 blocks/sec
```
`dist` is Euclidean over the 8-connected horizontal step (cardinal = 1,
diagonal = sqrt(2), MC allows full-speed diagonal strafing).

**MINE**, moving into a solid, breakable voxel. Steve is 2 blocks tall, so
a normal (non-crawl) mine ALWAYS clears both foot and head level, and is
charged for each level that's actually solid:
```
mine_cost = MINE_TIME[target] * tool_multiplier
if is_solid(head): mine_cost += MINE_TIME[head] * tool_multiplier
cost = mine_cost + dist / WALK_SPEED     # WALK_SPEED = 4.3 (not SPRINT_SPEED:
                                          # you can't sprint while actively mining)
```
Blocked entirely if the target or head is unbreakable or lava (a fluid
can't be mined out of the way, and standing there means your head is
literally in lava). This is the action every prune heuristic in §2-§7
gates.

**BOAT_CRAWL**, a known Minecraft movement technique: a boat placed on your
head compresses your hitbox so you only need the FOOT level cleared, not
head clearance, letting you tunnel through a 1-block-tall gap:
```
crawl_mine_cost = MINE_TIME[target] * tool_multiplier
startup_tax = 0 if already_crawling else BOAT_CRAWL_TAX   # = 5.0 sec, one-time
cost = crawl_mine_cost + startup_tax + dist / BOAT_CRAWL_SPEED  # = 3.0 blocks/sec
```
Only requires foot level cleared (head can stay solid); the state's
`crawling` flag is what lets consecutive crawl moves skip re-paying
`BOAT_CRAWL_TAX`. Lava at head level still blocks crawling, compressing
your hitbox doesn't make you immune to touching lava.

**BRIDGE**, placing a block to cross a gap (target/head clear, but no
solid floor below):
```
tax = BLOCK_TAX_BASE * (1 + BLOCK_TAX_SCARCITY_SCALE / blocks_remaining)  # scarcity-scaled
cost = PLACE_TIME + BRIDGE_RISK_PENALTY + tax + dist / SPRINT_SPEED
```
`PLACE_TIME = 0.2`, `BRIDGE_RISK_PENALTY = 1.0` (flat "insurance premium"
for the real risk of a sprint-bridge, misplaced block, fall into void/
lava, clutch-timing failure, not physical travel time), `BLOCK_TAX_BASE =
0.6`, `BLOCK_TAX_SCARCITY_SCALE = 3.0` (tax rises from `BLOCK_TAX_BASE`
toward `BLOCK_TAX_BASE * 4` as `blocks_remaining` -> 0, so the planner
increasingly prefers mining/detouring over spending blocks as supply runs
low, rather than only refusing to bridge once it's literally empty). A
separate branch handles bridging UP across a lava column (searches upward
for the first height where both feet and head clear the lava, capped at 6
blocks, adding `climb * JUMP_PENALTY` on top).

**CLIMB** (step-up), target one block higher has solid floor, clear
head/foot:
```
cost = dist / SPRINT_SPEED + JUMP_PENALTY   # JUMP_PENALTY = 0.15
```

**FALL**, dropping into air with no support. Any height is modeled as
survivable via clutch (water bucket), a known and RELIABLE Minecraft
technique, not a risk/probability, an explicit design choice:
```
cost = dist / SPRINT_SPEED + drop * 0.05
if drop > CLUTCH_THRESHOLD:            # = 3 blocks
    cost += CLUTCH_SETUP_TIME          # = 0.4 sec
if passed_through_or_landed_in_lava:
    cost += LAVA_DEATH_PENALTY         # = 1e6 -- the ONE truly forbidden outcome
```
Landing search scans downward for the first solid voxel; a lava cell
anywhere in that scan, or lava sitting directly on the landing spot, both
count as `passed_lava`.

**PARKOUR** (long jump / boat-jump), up to 7 blocks, gated behind a cheap
"is this even a ledge" check (skip entirely unless at least one adjacent
cell lacks solid footing) before sampling a precomputed kernel of ~180
direction/distance offsets:
```
risk = PARKOUR_RISK_BASE + PARKOUR_RISK_PER_BLOCK * dist   # 0.8 + 0.15*dist
cost = risk + dist / PARKOUR_SPEED                          # PARKOUR_SPEED = 6.5
```
Only offered if the straight-line trajectory is validated clear (samples
every block of the flight path for solid/lava obstruction, can't jump
*through* a wall) AND genuinely crosses a gap (at least one sampled point
along the path has no solid floor below it, can't use PARKOUR to
fast-travel over normal flat ground) AND lands on solid, clear ground.
`MIN_PARKOUR_DIST = 2.0` (short jumps ARE sometimes genuinely cheapest,
so this only excludes trivially-adjacent cells already covered by SPRINT/
CLIMB), `MAX_PARKOUR_DIST = 7.0`.

**MINE_DOWN**, vertical mining straight down (rare, kept for generality):
```
cost = MINE_TIME[below] * tool_multiplier + 0.2
```

### 13.4 The heuristic and the search loop

Admissible heuristic (never overestimates, since no action is ever faster
than free sprinting):
```
octile(dx, dz) = (|dx|+|dz|) + (sqrt(2)-2) * min(|dx|,|dz|)   # octile distance
h(pos, goal) = (octile(gx-x, gz-z) + |gy-y|) / SPRINT_SPEED
```
Standard weighted A*: priority = `g + epsilon * h`, `epsilon > 1` trades
optimality for speed (bounded-suboptimal: the returned path costs at most
`epsilon` times the true optimum). `epsilon = 1.5` is this project's usual
practical operating point; the heuristic-comparison harness in §14 also
runs `epsilon = 1.0` (true-optimal) specifically to measure how much path
quality each prune heuristic actually costs, not just how much faster it
searches.
```python
open_heap = [(epsilon * h(start), start)]
g_score = {start: 0.0}
while open_heap:
    state = pop lowest priority
    if state in closed: continue
    closed.add(state); expansions += 1
    if state.xyz == goal: return reconstruct_path()
    for new_state, cost, action in get_neighbors(world, state):
        tentative_g = g_score[state] + cost
        if tentative_g < g_score.get(new_state, inf):
            g_score[new_state] = tentative_g
            push(new_state, tentative_g + epsilon * h(new_state, goal))
```
This loop, and every cost formula in §13.3, is identical across all five
`MinePruneMode` arms in §2-§7, the ONLY thing any of those arms changes is
whether a given MINE candidate gets yielded by `get_neighbors` /
`EdgeRules.horizontalEdges` at all. That's the whole point of the
experiment design: one shared, unmodified "obviously correct" model,
A/B'd on exactly one decision within it.

## 14. Prune-heuristic implementation reference

Complete, current source of every piece built/changed this session, plus
project context needed to compile and rerun any of it independently. All
paths are relative to the repo root, `mc_pathfind`. **This section is only
the MINE-prune A/B machinery**, see §13 first for the non-prune,
"obviously correct" foundation this all sits on top of (world model, state
representation, every other action's cost formula, the search loop itself).

### 14.1 Project/module layout

- Python side (repo root): `world.py` (voxel world + synthetic generators),
  `pathfind.py` (the original weighted A* this project started from),
  `mca_convert.py` (real `.mca` -> voxel array, block-type mapping table),
  `build_visualization.py` (regenerates the 3D HTML viewer).
- Java side (`java/`): a from-scratch port of just the search core, NOT the
  `.mca` parsing/replanning/visualization (those stay Python-side).
  - `java/core/src/main/java/dev/mcpathfind/core/`, the module everything
    in this dossier lives in and modifies. Package `dev.mcpathfind.core`.
  - `java/benchmark/`, a CLI (`BenchmarkCli`) that loads a `.wbin` and
    times the solver; not used directly this session (superseded by
    `MineHeuristicShowdown.java` for this investigation) but same idea.
  - `java/pearl/`, a SEPARATE, unrelated module (ender-pearl-throw
    mechanics) explicitly out of scope for this post, per the person's own
    instruction mid-session ("dont check the pearl, thats a different
    mode"). Do not conflate `dev.mcpathfind.pearl` with anything in this
    dossier.
  - No committed build wrapper (`gradlew`) in this sandboxed session --
    everything was compiled directly with `javac` against a `fastutil` jar
    fetched from Maven Central. Exact commands used throughout, run from
    `java/`:
    ```
    curl -sL -o fastutil.jar \
      https://repo1.maven.org/maven2/it/unimi/dsi/fastutil/8.5.18/fastutil-8.5.18.jar
    javac -cp fastutil.jar -d out $(find core/src/main/java -name '*.java') \
      ../experiments/MineHeuristicShowdown.java
    java -Xmx6g -cp "out;fastutil.jar" MineHeuristicShowdown <wbin-dir> <maxExpansions>
    ```
    (swap `;` for `:` on macOS/Linux). `<wbin-dir>` is a directory of
    `.wbin` files (see `export_world_bin.py` at the repo root for how those
    are produced from real `.mca` region files); `<maxExpansions>` was
    `15_000_000`-`20_000_000` throughout this session's real-terrain runs.

### 14.2 `NearestAirDistance.java` (new this session, full source)

```java
package dev.mcpathfind.core;

public final class NearestAirDistance {
    public static final int NOT_FOUND = Integer.MAX_VALUE;

    private NearestAirDistance() {}

    // Manhattan distance from (x,y,z) to the nearest non-solid voxel, or
    // NOT_FOUND if none within maxRadius. (excludeX,excludeY,excludeZ) is
    // skipped even if non-solid -- required so the scan doesn't just find
    // the player's own (always-open) current cell and return 1 every time,
    // since every MINE target is exactly one step from it by construction.
    public static int distanceToAir(World world, int x, int y, int z,
                                     int excludeX, int excludeY, int excludeZ, int maxRadius) {
        if (!(x == excludeX && y == excludeY && z == excludeZ) && !BlockType.isSolid(world.voxelAt(x, y, z))) {
            return 0;
        }
        for (int r = 1; r <= maxRadius; r++) {
            for (int dx = -r; dx <= r; dx++) {
                int remX = r - Math.abs(dx);
                for (int dy = -remX; dy <= remX; dy++) {
                    int dz = remX - Math.abs(dy);
                    if (isOpen(world, x + dx, y + dy, z + dz, excludeX, excludeY, excludeZ)) {
                        return r;
                    }
                    if (dz != 0 && isOpen(world, x + dx, y + dy, z - dz, excludeX, excludeY, excludeZ)) {
                        return r;
                    }
                }
            }
        }
        return NOT_FOUND;
    }

    private static boolean isOpen(World world, int x, int y, int z, int excludeX, int excludeY, int excludeZ) {
        if (x == excludeX && y == excludeY && z == excludeZ) {
            return false;
        }
        return !BlockType.isSolid(world.voxelAt(x, y, z));
    }

    public static boolean shouldPrune(World world, int targetX, int targetY, int targetZ,
                                       int sourceX, int sourceY, int sourceZ, int maxRadius, int pruneRadius) {
        int d = distanceToAir(world, targetX, targetY, targetZ, sourceX, sourceY, sourceZ, maxRadius);
        return d > pruneRadius;
    }
}
```
Tunables live in `EdgeRules.java`: `NEAREST_AIR_MAX_RADIUS = 6` (search
bound), `NEAREST_AIR_PRUNE_RADIUS = 3` (the actual threshold, picked from
a light sweep of {1,2,3,4,6} on 2 regions; radius<=2 reproduced MANHATTAN's
quality loss, 3 was the smallest radius that didn't).

### 14.3 `StoneDensityField.java` (new this session, full source: the HYBRID attempt)

```java
package dev.mcpathfind.core;

public final class StoneDensityField {
    public static final int CHUNK = AirPotentialField.CHUNK; // = 4

    private final int chunksX, chunksY, chunksZ;
    private final float[] chunkStoneFraction;

    private StoneDensityField(int chunksX, int chunksY, int chunksZ, float[] chunkStoneFraction) {
        this.chunksX = chunksX; this.chunksY = chunksY; this.chunksZ = chunksZ;
        this.chunkStoneFraction = chunkStoneFraction;
    }

    public double densityAt(int x, int y, int z) {
        int cx = Math.floorDiv(x, CHUNK), cy = Math.floorDiv(y, CHUNK), cz = Math.floorDiv(z, CHUNK);
        if (cx < 0 || cx >= chunksX || cy < 0 || cy >= chunksY || cz < 0 || cz >= chunksZ) return 0.0;
        return chunkStoneFraction[(cx * chunksY + cy) * chunksZ + cz];
    }

    public static StoneDensityField build(World world) {
        int chunksX = ceilDiv(world.sizeX, CHUNK), chunksY = ceilDiv(world.sizeY, CHUNK), chunksZ = ceilDiv(world.sizeZ, CHUNK);
        float[] fraction = new float[chunksX * chunksY * chunksZ];
        for (int cx = 0; cx < chunksX; cx++) {
            int x0 = cx * CHUNK, x1 = Math.min(x0 + CHUNK, world.sizeX);
            for (int cy = 0; cy < chunksY; cy++) {
                int y0 = cy * CHUNK, y1 = Math.min(y0 + CHUNK, world.sizeY);
                for (int cz = 0; cz < chunksZ; cz++) {
                    int z0 = cz * CHUNK, z1 = Math.min(z0 + CHUNK, world.sizeZ);
                    int total = 0, stone = 0;
                    for (int x = x0; x < x1; x++)
                        for (int y = y0; y < y1; y++)
                            for (int z = z0; z < z1; z++) {
                                total++;
                                if (world.voxelAt(x, y, z) == BlockType.STONE) stone++;
                            }
                    fraction[(cx * chunksY + cy) * chunksZ + cz] = total > 0 ? (float) stone / total : 0f;
                }
            }
        }
        return new StoneDensityField(chunksX, chunksY, chunksZ, fraction);
    }

    private static int ceilDiv(int a, int b) { return (a + b - 1) / b; }
}
```
`STONE` (block code 2) specifically means the blackstone/basalt/polished-
blackstone-brick family per `mca_convert.py`'s mapping table, distinct
from `DIRT` (code 1, netherrack and other ordinary terrain). This
distinction is the entire point: a generic `isSolid()` density would read
"high" almost everywhere in the Nether (floors/ceilings/cave walls are
locally solid nearly everywhere), carrying no signal. `HYBRID_STONE_DENSITY_THRESHOLD = 0.35`
lives in `EdgeRules.java`.

### 14.4 `EdgeRules.java`: the complete MINE-prune decision chain

This is the actual shape of the A/B toggle, verbatim from the live file
(inside `horizontalEdges`, guarding the branch where `target` is solid):

```java
if (BlockType.isSolid(target)) {
    if (BlockType.isUnbreakable(target) || BlockType.isUnbreakable(head) || BlockType.isLava(head)) {
        // normal 2-tall mining blocked; boat-crawl may still work below
    } else if (airPotential != null && airPotential.shouldPruneMine(MINE_PRUNE_THRESHOLD, x, y, z, nx, y, nz)) {
        // AIR_POTENTIAL prune
    } else if (manhattanPruneEnabled && !mineMovesCloserToGoal(x, y, z, nx, nz, goal)) {
        // MANHATTAN prune
    } else if (nearestAirPruneEnabled && NearestAirDistance.shouldPrune(world, nx, y, nz, x, y, z,
            NEAREST_AIR_MAX_RADIUS, NEAREST_AIR_PRUNE_RADIUS)) {
        // NEAREST_AIR prune
    } else if (hybridDensityField != null && (hybridDensityField.densityAt(nx, y, nz) >= HYBRID_STONE_DENSITY_THRESHOLD
            ? NearestAirDistance.shouldPrune(world, nx, y, nz, x, y, z, NEAREST_AIR_MAX_RADIUS, NEAREST_AIR_PRUNE_RADIUS)
            : (hybridAirPotential != null && hybridAirPotential.shouldPruneMine(MINE_PRUNE_THRESHOLD, x, y, z, nx, y, nz)))) {
        // HYBRID prune -- density-gated switch between the two checks above
    } else {
        // survives every active prune -- compute real MINE cost, emit the edge
        double mineCost = BlockType.mineTime(target) * toolMultiplier;
        if (BlockType.isSolid(head)) mineCost += BlockType.mineTime(head) * toolMultiplier;
        double cost = Math.max(mineCost, dist / SPRINT_SPEED) + MINE_DURABILITY_TAX;
        out.accept(StateCodec.pack(nx, y, nz, blocks, false), cost, Action.MINE);
    }
    // ... (BOAT_CRAWL branch follows, unaffected by any of the above)
}
```
Only ONE prune is ever active at a time in practice (gated by
`WeightedAStar.minePruneMode`, which only ever sets one of
`airPotential`/`manhattanPruneEnabled`/`nearestAirPruneEnabled`/
`hybridDensityField` non-null/true per search) -- the chain's left-to-right
short-circuit order matters only in the hypothetical case of combining them,
which the harness never does.

### 14.5 `WeightedAStar.java`: the mode enum and per-search setup

```java
public enum MinePruneMode { NONE, AIR_POTENTIAL, MANHATTAN, NEAREST_AIR, HYBRID }
public static MinePruneMode minePruneMode = MinePruneMode.AIR_POTENTIAL;

// inside search(), before the main loop:
if (minePruneMode == MinePruneMode.AIR_POTENTIAL) {
    AirPotentialField field = AirPotentialField.build(world, start.x(), start.y(), start.z());
    this.airPotential = new AirPotential(field, /* scaleBfs */ 3.0);
} else {
    this.airPotential = null;
}

if (minePruneMode == MinePruneMode.HYBRID) {
    AirPotentialField field = AirPotentialField.build(world, start.x(), start.y(), start.z());
    this.hybridAirPotential = new AirPotential(field, /* scaleBfs */ 3.0);
    this.hybridDensityField = StoneDensityField.build(world);
} else {
    this.hybridAirPotential = null;
    this.hybridDensityField = null;
}
```
This is the ENTIRE mechanism that made this whole investigation possible
without writing a separate test harness that risked diverging from the
real solver: flip one static field, run the real `search()`, get a real
result. `MANHATTAN` and `NEAREST_AIR` pre-date or were added without
needing any precompute at all -- only `AIR_POTENTIAL` and `HYBRID` build a
field before the search loop starts.

### 14.6 `experiments/MineHeuristicShowdown.java` (the harness, full source)

```java
import dev.mcpathfind.core.AirPotential;
import dev.mcpathfind.core.PathValidator;
import dev.mcpathfind.core.SearchResult;
import dev.mcpathfind.core.StateCodec;
import dev.mcpathfind.core.WeightedAStar;
import dev.mcpathfind.core.io.WorldBinFormat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class MineHeuristicShowdown {
    public static void main(String[] args) throws Exception {
        Path dataDir = Path.of(args.length > 0 ? args[0] : "benchmark/data");
        int maxExpansions = args.length > 1 ? Integer.parseInt(args[1]) : 6_000_000;

        List<Path> regions = new ArrayList<>();
        try (var stream = Files.list(dataDir)) {
            stream.filter(p -> p.toString().endsWith(".wbin"))
                  .sorted(Comparator.comparing(Path::toString))
                  .forEach(regions::add);
        }

        System.out.println("region,epsilon,mode,found,cost,expansions,ms,actions,validator");
        for (Path region : regions) {
            WorldBinFormat.Loaded loaded = WorldBinFormat.load(region);
            var start = new StateCodec.State(loaded.start().x(), loaded.start().y(), loaded.start().z(), 0, false);
            var goal = new StateCodec.State(loaded.goal().x(), loaded.goal().y(), loaded.goal().z(), 0, false);

            for (double eps : new double[] {1.5, 1.0}) {
                for (WeightedAStar.MinePruneMode mode : WeightedAStar.MinePruneMode.values()) {
                    WeightedAStar.minePruneMode = mode;
                    AirPotential.OLD_GROUND_CUTOFF = -1; // repo default, unchanged across arms

                    long t0 = System.nanoTime();
                    WeightedAStar solver = new WeightedAStar();
                    SearchResult r = solver.search(loaded.world(), start, goal,
                            loaded.blocksAvailable(), eps, 1.0, maxExpansions);
                    double ms = (System.nanoTime() - t0) / 1e6;

                    String validator = "-";
                    int actionCount = -1;
                    if (r.found()) {
                        var violations = PathValidator.validate(loaded.world(), r.path(), r.actions());
                        validator = violations.isEmpty() ? "OK" : (violations.size() + "_VIOLATIONS");
                        actionCount = r.actions().length;
                    }
                    System.out.printf(Locale.ROOT, "%s,%.1f,%s,%b,%.4f,%d,%.1f,%d,%s%n",
                            region.getFileName(), eps, mode, r.found(),
                            r.found() ? r.totalCost() : -1.0, r.expansions(), ms, actionCount, validator);
                    System.out.flush();
                }
            }
        }
    }
}
```
Note this loops `WeightedAStar.MinePruneMode.values()` -- adding `HYBRID`
to the enum automatically made it a 5th tested arm with zero changes to
this file, which is why every table from the `HYBRID` era onward has 5
rows per region/epsilon instead of 4.

### 14.7 Real-region test data: how it was produced and where it lives

Every `.wbin` used in this dossier's tables was produced by
`export_world_bin.py` (repo root) from a real `.mca` region file:
```
python3 export_world_bin.py <region.mca> <output.wbin> [--start x,y,z --goal x,y,z] [--blocks 32]
```
Without `--start`/`--goal`, it auto-picks the two points maximally far
apart by walked hop-count within the region's largest connected walkable
component (`build_visualization._find_region_route`, which calls
`reachability.largest_walkable_component` + `reachability.diameter_endpoints`
-- both in `reachability.py`, repo root). This is what produced every
"walk-diameter" region's start/goal in §5-6 of this dossier.

The two hand-built bastion scenarios in §6 used explicit `--start`/`--goal`
instead, constructed via a bastion-locating script that is NOT part of the
repo (built ad hoc this session, not saved as a permanent tool): scan for
the highest-density 16-block-window cluster of `STONE`-mapped voxels
(distinct from `DIRT` -- see §14.3) to find the bastion's centroid, then
either pick the most-enclosed nearby air pocket (the flawed §6a approach)
or walk the straight line from a candidate start toward that centroid and
find where local density first crosses a threshold (the corrected §6b
"perimeter" approach). If this needs reproducing, that logic would need to
be rewritten from this description -- it does not exist as a saved script.

Real region source: my own local Minecraft saves directory. Each world
folder has a `DIM-1/region/*.mca` (Nether, what this dossier
uses) and a `region/*.mca` (Overworld, NOT used -- bastions don't exist
there). Future sessions can pull directly from that saves
directory without being handed an explicit file list.
