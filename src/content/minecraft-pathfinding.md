The expensive part of letting a Minecraft agent dig is deciding which digs to even consider. In one 368 × 128 × 368 Nether snapshot, the solver generated **2.39 million MINE candidates** in a single search. Only **11.3%** improved a best-known path cost. The other **88.7%** were work that went nowhere.

I built a route planner for Minecraft terrain, a Java research project ([mc-pathfind](https://github.com/KhiemGOM/mc-pathfind)) that plans through a pre-loaded chunk of the Nether where the agent can mine, bridge, climb, fall, and parkour rather than only walk. This is the story of Air Potential: a cheap filter for the digging decision, the alternatives I tested against it, and the places where it makes the wrong call. The search underneath is weighted A* (Pohl, 1970), and it stays the same throughout. What changes is which mining edges it is allowed to see.

## The world, the moves, and the search


### The world is a flat array of block codes

A region is one byte array with a [World](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/World.java) wrapper: `index = (x · sizeY + y) · sizeZ + z`. A lookup outside the array returns a VOID sentinel instead of throwing, so edge code can probe neighbors without bounds checks scattered through it. [BlockType](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/BlockType.java) collapses Minecraft's block list into six codes: air, dirt, stone, obsidian, bedrock, and lava. Dirt stands in for soft material such as netherrack, and stone for blackstone and basalt. Bedrock is solid and unbreakable. Lava is not solid, but it is never safe to enter.

Only the properties the planner reads survive that collapse: solid or not, breakable or not, lava or not, and how long it takes to mine (0.3 s for dirt, 1.2 s for stone, 9 s for obsidian, before a tool multiplier).

### A state is more than a position

A search node is `(x, y, z, blocksRemaining, crawling)`. Position alone is not enough. The block count matters because bridging spends inventory, and an agent standing at the same cell with 3 blocks left has different options from one with 60. The crawl flag matters because crawling changes which cells are passable and which moves pay a startup cost.

[StateCodec](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/StateCodec.java) packs all five fields into a single 64-bit `long` (16 bits each for x and z, 10 for y, 8 for the block count, 1 for the crawl flag), so the hot loop never allocates an object per node. Each packed state is then interned to a small integer id the first time it appears, and the cost, parent, and closed arrays are indexed by that id.

### Moves are edges with a cost in seconds

Every move returns a target state and a cost in estimated seconds. The rules live in one place, [EdgeRules](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/EdgeRules.java), and the search only asks it "what can I do from here?".

| Move | What it does | Cost (seconds) |
| --- | --- | --- |
| SPRINT | Step to an adjacent cell with solid floor and clear headroom | distance / 5.6 |
| CLIMB | Step up one block | distance / 5.6 + 0.15 |
| FALL | Step off an edge and land below | distance / 5.6 + 0.05 per block dropped, +0.4 past 3 blocks, +1,000,000 if the fall crosses lava |
| MINE | Dig the cell ahead and the cell above it while moving | max(mining time, distance / 5.6) + 0.2 |
| MINE_DOWN | Dig straight down | mining time + 0.2 |
| BOAT_CRAWL | Dig only the foot-level cell of a two-tall wall and crawl through the one-block gap | max(mining time, distance / 3) + 0.2, plus 5 to start crawling |
| BRIDGE | Place a block over a gap and walk onto it | 0.2 + 0.5 + tax + distance / 5.6 |
| BRIDGE_UP | Pillar straight up by placing blocks underneath | same placement cost and tax as BRIDGE |
| PARKOUR | Jump 3, 4, or 6 blocks along one axis, landing up to a block higher or lower | short jumps cost about one CLIMB; longer ones add a risk term per block |

Distance is 1 for a cardinal step and √2 for a diagonal. A diagonal is illegal when both flanking cells are solid, as in the game. Mining and moving overlap, which is why MINE takes the max of the two times rather than their sum. The extra 0.2 on MINE, MINE_DOWN, and BOAT_CRAWL is a tie-breaker, not a game mechanic: with a fast tool, mining time drops to zero, and without it a dig would tie exactly with an equal-length sprint.

BRIDGE is the one move whose price depends on the state. Its tax is **0.6 × (1 + 3 / n)** for **n** blocks remaining: about 0.63 s with a full stack of 64, and 2.4 s on the last block. Placing a block is cheap while the inventory is full and expensive as it runs out, so the search spends blocks where they matter most. The action costs are simulated and hand-tuned, not measured from play, and that is one of the limits listed at the end.

The heuristic is straight-line distance over sprint speed (horizontal distance in the octile sense, plus vertical distance), multiplied by epsilon. The weight is what makes the search weighted A*: at epsilon 1.0 it is ordinary A*, and above 1.0 it trades path quality for fewer expansions.

### Two searches, one rulebook

The repository has a forward-only solver, [WeightedAStar](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/WeightedAStar.java), and a bidirectional one, [BidirectionalWeightedAStar](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/BidirectionalWeightedAStar.java). The bidirectional version runs a forward search from the start and a backward search from the goal, one expansion each in turn. Whenever the two frontiers touch, it records the joined path cost as **μ**, the best full route found so far.

Two design choices carry most of the weight.

**One rulebook, two directions.** The backward half does not have its own hand-written movement rules. It asks EdgeRules for the cells that could have led to a given state, then checks each candidate against the forward rule for the same move. If the forward rule would not produce that exact edge at that exact cost, the reverse candidate is discarded. This makes it structurally hard for the two directions to disagree about what a move is.

**A smaller backward state.** The forward state includes the block count, and the backward search cannot know it: how many blocks remain at a meeting point depends on what the forward prefix has already spent. Copying the backward graph once per possible block count was correct but far too expensive on real terrain. Instead, the backward state is just `(x, y, z, crawling)`, and the number of bridges its path used is carried alongside as a plain counter. Each reverse BRIDGE is priced as if it used the last remaining block, then the next one out as if it used the last two, and so on. That overestimates the true cost, and the final path cost is recomputed exactly once the meeting point is known. A meeting is only accepted if the forward side had enough blocks left to pay for the backward segment.

The stopping rule is where this gets subtle. The textbook bidirectional rule stops when the best forward priority plus the best backward priority is at least μ. That rule is proved for bidirectional Dijkstra, where both heuristics are zero. Pohl's original bidirectional A* (1971) already ran into the same problem: with two real heuristics that are individually admissible but not balanced against each other, the sum can pass μ before μ is optimal. It happened here. On a synthetic world with an 8-block stone wall, where crawling is the cheaper way through (16.43 s), the search accepted a first meeting of 18.16 s, a route that mined two blocks and crawled the other six and paid the crawl startup cost for a partial crawl.

The fully rigorous fix is to trust only the forward priority. I tried it: on one real region, expansions roughly doubled (about 876K to 1.68M) and wall-clock time roughly tripled (1.7 s to 6.0 s), slower than running forward-only. What the solver does instead is require μ to survive **2,000 expansions** without improving before the sum rule is trusted. That is a mitigation, not a proof. The forward search still ends when it pops the real goal, exactly as WeightedAStar does, which is what keeps the bidirectional result from being worse than the forward-only one.

Forward and backward also see different terrain rules for pruning. The MINE filters described in this post apply to the forward half only. The backward half's reverse-MINE probing stays unpruned, because threading a filter through reverse probing risks exactly the forward-and-backward divergence described above. The experiments below therefore use the forward-only WeightedAStar, so the only thing that changes between modes is the MINE filter.

## Watch the decisions happen

The viewer replays routes exported by the solver. Start with **Mining Wins** to watch a wall open, or **Bridge Gauntlet** to watch blocks placed across a gap and underneath the player. Scrub backward to restore the terrain. The real-terrain scenes come from Nether region files; the lab scenes isolate particular actions. These replay routes are illustrations, separate from the five-mode benchmark below.

<!-- demo -->

## A nearby space can be a long way away

Air on the other side of a thin wall is physically close but may take a long walk to reach. That mismatch is the signal I want. Air already beside the player should not make every nearby block look like an exciting shortcut.

Before each search, [**AirPotentialField**](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/AirPotentialField.java) runs a breadth-first search through air connectivity, starting at the search origin. It works on **4 × 4 × 4** chunks, ignoring detailed walkability rules. Air Potential then combines the difference in chunk-hop distance with inverse-square Euclidean distance.

$$
\Delta = D_s(v)-D_s(u)
$$

$$
P(u,v)=\begin{cases}0 & \text{if either chunk is UNREACHED, or }\Delta\le c\\[4pt](1-e^{-(\Delta-c)/s})/\lVert v-u\rVert_2^2 & \text{otherwise}\end{cases}
$$

Prune a MINE candidate when **P(u,v) < τ**. The live constants are **c = −1**, **s = 3.0**, and **τ = 0.02**. Here, u is the current position and v is the proposed dig target; both distances come from the same field seeded at the start of the search.

The exponential term suppresses nearby air that offers little topological novelty. The inverse-square term discounts distant candidates. Together, they favor space that is physically near but far away through the existing air network.

There is a subtlety: the actual call site usually compares immediately adjacent positions. Squared distance is then only **1 or 2**, whether the wall is one block thick or eight. The distance term alone cannot recognize thickness on that first step. The distinguishing information comes from the **chunk-BFS delta**, or from the target chunk being unreachable. This is a coarse proxy, not an exact wall-thickness measurement.

Air connectivity is useful because sprinting, climbing, falling, crawling, and parkour mostly traverse existing open space. Bridging adds support while moving through that space. Mining removes an obstruction. But connectivity is still not walkability: that approximation is part of the tradeoff.

## Three iterations before the useful one

The Javadoc on [AirPotential.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/AirPotential.java) records the experiments that led here. First I discounted promising digs. Then I penalized unpromising ones. Finally I stopped generating the weak candidates at all.

| Version | MINE candidates | Improve rate | Search effect |
| --- | --- | --- | --- |
| Before Air Potential | 2.39M | 11.3% | Reference |
| Soft discount | Approximately unchanged | 11.5% | Almost no effect |
| Soft penalty | About −10% | Not reported | About −8% expansions, but ~3.0s → ~3.6s |
| Hard prune | 121K (about −95%) | 19.3% | Expansions and elapsed time below the original baseline |

<!-- history -->

The penalty version is the warning I keep coming back to: fewer expansions did not mean a faster search. The check cost more than it saved. The hard prune finally changed the common case, but on **k1_r_0_0** it also raised path cost from **21.48 to 26.07**. A valid route can still be a worse route.

## Five modes, the same search

All five modes run through the production [**WeightedAStar**](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/WeightedAStar.java) and its shared action costs. A static MinePruneMode toggle changes the MINE filter inside [EdgeRules.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/EdgeRules.java); this is not five separately implemented solvers.

| Mode | The question it asks |
| --- | --- |
| NONE | What happens if every otherwise legal dig is considered? |
| AIR_POTENTIAL | Is this target physically near but topologically novel? |
| MANHATTAN | Does this dig strictly decrease Manhattan distance to the goal? |
| NEAREST_AIR | Is another non-solid cell close enough to this dig target? |
| HYBRID | Is local stone density high enough to use Nearest Air instead of Air Potential? |

[Nearest Air](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/NearestAirDistance.java) scans Manhattan-distance shells, with **maximum radius 6** and **prune radius 3**. A light sweep of **{1, 2, 3, 4, 6} on two regions** picked 3: radii at or below 2 reproduced Manhattan's quality loss. Its first implementation had a particularly silly failure: every dig target is next to the player's current air cell, so the answer was always 1. Explicitly excluding that source cell made the check meaningful. It still tests proximity, not connectivity, and scans up to O(radius³) cells per candidate.

## Twenty regions, not twenty random routes

The corpus contains **12 regions** that ship with the project as test fixtures (four each from three worlds I call k1, k2, and long1) and **eight additional regions** exported from my own Minecraft save files, so most of the corpus is ordinary generated Nether rather than terrain built to suit the test. I surveyed **20 candidate region files across six separate worlds**, rejecting any region whose largest walkable component held fewer than roughly **4,000 cells**. One had just **128**.

One pair turned out to be the same terrain generated twice, so I counted it once rather than as two samples. The accepted additions were:

<!-- corpus -->

Each region gets one route inside its largest walkable component, with endpoints selected by double-sweep BFS to find a long walked route. These are walk-diameter test routes, not independent random samples of every possible bastion approach.

**20 regions × 2 epsilon settings × 5 modes = 200 runs.** Epsilon is the weight applied to the heuristic: **1.5** is the setting I actually run, and **1.0** reduces the search to ordinary A* (Hart, Nilsson, and Raphael, 1968). Every run found a path and passed [**PathValidator**](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/PathValidator.java), the per-path legality checker I run over every result, with no invalid paths, no runs that failed to reach the goal, and none exhausting the **20M-expansion** budget. Turning pruning on can remove optimal edges even at epsilon 1.0; it does not inherit an optimality guarantee relative to the original graph.

## The broad comparison

Across the **40 region/epsilon pairs**, Air Potential bought the largest average reduction in expansions. Nearest Air preserved the baseline cost in every pair but reduced less search work. The percentages below are averages relative to NONE, and the failure columns count regions rather than individual runs.

<!-- aggregate -->

The averages hide the interesting failures. On **1uIGhtjEX_r_0_0**, Air Potential increased cost by **0.6–0.9%**, and at epsilon 1.5 expanded **3.1%** more nodes than NONE. On **k1_r_0_neg1**, cost increased **0.65–0.85%**. These are small regressions, but real ones.

Manhattan's worst case was **long1_r_0_0 at epsilon 1.0**: **90.8% more expansions and 5.3% higher cost** simultaneously. A useful sideways or backward dig can initially move away from the goal. Forbidding it forces a detour that can also take more search to discover.

### What each expansion costs

Counting expansions misses the price of the check itself. These timing averages cover the **21 measurements with at least 50K expansions**, where the per-expansion cost is not swamped by startup noise.

<!-- timing -->

Air Potential is an **O(1) lookup** after precomputation. Nearest Air pays for a scan every time. Its **4.636 µs/expansion** is about 18% above NONE's 3.933 and 24% above Air Potential's 3.731.

## The agent needs to reach a bastion

Long walked routes test robustness, but the real task is to approach a bastion from about **12–15 chunks (192–240 blocks)** away and breach its outer wall. I built two scenarios on **1uIGhtjEX_r_0_0**, a **272 × 128 × 368** region.

A **16-block window** scan of stone density found a candidate centroid at **(57, 37, 136)** with peak density **0.99**. Here STONE includes blackstone and basalt; ordinary netherrack maps to DIRT. Only **one of four** surveyed region windows gave a confident detection. The other three may have had their bastions outside the exported window.

### First attempt: the wrong destination

I picked an enclosed air pocket near that peak. That made the task “reach an interior room,” not “cross the outer wall.” Start **(22, 78, 329)** and goal **(57, 41, 140)** are about **192 blocks** apart. This is an informative stress case, explicitly not the representative approach.

<!-- interior -->

At epsilon 1.0, Air Potential lost on cost, expansions, and elapsed time compared with NONE. One hypothesis is that the field's relative-distance signal has too little useful range inside a compact structure. That explanation is consistent with the later density diagnosis, but was not proved. The field remains seeded at the search start; it is not rebuilt at every expanded position.

### Corrected: cross the perimeter

Keeping the same start, I moved the goal to **(55, 43, 153)**, just past the outer wall on the approach toward the centroid. Local stone density first crossed **0.35** about **89.5%** of the way along that line, so nearly the whole approach is open ground with the wall only at the end.

<!-- perimeter -->

Every mode returned cost **57.67** at epsilon 1.0. Manhattan won this scenario at **5,479 ms** and **1.607M expansions**, because a mostly straight approach never exercised its bad case. Air Potential reached **5,849 ms**; Nearest Air took **7,213 ms**. That is why I cannot pick one universal winner from an average.

## The hybrid: a working switch with the wrong signal

The idea was to pay for Nearest Air only near a structure. In [StoneDensityField.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/StoneDensityField.java) I precomputed the **STONE fraction in each 4 × 4 × 4 chunk**. At or above **0.35**, use Nearest Air; below it, use Air Potential. Generic solid density would fire throughout the Nether, so the material distinction mattered.

The density field worked. It read **0.844** at the interior goal, and **94.4%** of nearby samples crossed the threshold. But only about **1.3%** of the world crossed it. A thin, useful wall has air on both sides: a chunk straddling a **1–2 block** wall may average only **20–30% stone**. The gate misses that wall while happily flagging a mass of rock ten blocks deep.

<!-- density -->

HYBRID repeated Air Potential's exact **four cost-regression regions** and its expansion failure. Its average expansion change was **−5.20%**, versus Air Potential's **−5.32%**, and both averaged **+0.072% cost**. Its **4.219 µs/expansion** sits between Air Potential's 3.731 and Nearest Air's 4.636, so the gate did limit the expensive check. It just switched in the wrong places.

The next experiment would measure thinness, perhaps a ring or shell excluding the immediate neighborhood, instead of mass. I have not run it.

## A different problem from Baritone

Baritone provides useful context, not a head-to-head result. Its mining-duration calculation accounts for block properties, tool strength, falling blocks, and liquid safety. Its documented segmented search and **2-bit-per-block** terrain cache make different planning tradeoffs from the large offline region snapshots my planner works over. See [MovementHelper.java](https://github.com/cabaletta/baritone/blob/master/src/main/java/baritone/pathing/movement/MovementHelper.java) and [Baritone's features](https://github.com/cabaletta/baritone/blob/master/FEATURES.md).

There was no Baritone benchmark here, and this work does not establish a performance advantage over it.

## What I would actually take away

**Air Potential** has the best average expansion reduction and the cheapest measured per-expansion cost in this corpus, while sometimes discarding a useful dig. **Nearest Air** had zero observed cost or expansion regressions across all **44 test pairs**, including the two extra scenarios at two epsilon settings, but consistently cost more per expansion. That record is evidence, not a correctness proof.

**Manhattan** can win a simple approach and fail badly elsewhere. **Hybrid** demonstrates that a cheap gate can control overhead without demonstrating that stone density is the right gate.

Every number above came out of one harness, [MineHeuristicShowdown.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/experiments/MineHeuristicShowdown.java), which loads each region, runs all five modes at both epsilon settings, validates the result, and prints CSV.

The limits matter: one chosen route per region; light tuning on two regions for the new filters; simulated, hand-tuned action costs; and independent per-path validation rather than an automated CI test suite. PathValidator checked legality, not optimality.

For this agent, the engineering choice is how much work to spend on the decision before a dig ever enters the search. The best average shortcut is useful precisely because I can also show where it breaks.

## References

- Hart, P. E., Nilsson, N. J., and Raphael, B. (1968). “A Formal Basis for the Heuristic Determination of Minimum Cost Paths.” *IEEE Transactions on Systems Science and Cybernetics* 4(2), 100–107.
- Pohl, I. (1970). “Heuristic search viewed as path finding in a graph.” *Artificial Intelligence* 1(3–4), 193–204. The source of the epsilon-weighted heuristic used throughout.
- Pohl, I. (1971). “Bi-directional search.” In Meltzer, B. and Michie, D. (eds.), *Machine Intelligence 6*, 127–140. The original bidirectional heuristic search, and the source of the stopping-rule problem discussed in the search section.
- Baritone, an open-source Minecraft pathfinding bot: [repository](https://github.com/cabaletta/baritone), [feature documentation](https://github.com/cabaletta/baritone/blob/master/FEATURES.md), and [MovementHelper.java](https://github.com/cabaletta/baritone/blob/master/src/main/java/baritone/pathing/movement/MovementHelper.java), which holds the mining-duration calculation discussed above.
- This project: [KhiemGOM/mc-pathfind](https://github.com/KhiemGOM/mc-pathfind). The filters discussed here live in [AirPotential.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/AirPotential.java), [AirPotentialField.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/AirPotentialField.java), [NearestAirDistance.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/NearestAirDistance.java), and [StoneDensityField.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/StoneDensityField.java), with the mode switch in [EdgeRules.java](https://github.com/KhiemGOM/mc-pathfind/blob/master/java/core/src/main/java/dev/mcpathfind/core/EdgeRules.java).

