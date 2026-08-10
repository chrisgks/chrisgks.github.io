---
title: 'Belief-State Management for Decision Systems'
description: 'Why the policy isn’t the centre'
pubDate: '2026-07-02'
heroImage: '/images/belief_centre_origami.webp'
ogImage: '/images/og-belief-state.jpg'
---

<p align="center"><img loading="eager" fetchpriority="high" decoding="async" src="/images/belief_centre_origami.webp" width="420" alt="A soft origami cloud at the centre, with four folded paper rays around it on cream paper"><br><em>Belief at the centre — uncertain, shared, read by everything around it.</em></p>

A note on where to put the centre of a decision system — more architecture than algorithm.

Personalisation is a familiar entry point. Systems often start with a bandit, for a sensible reason: it chooses the action, the action is what the user sees, and so it feels like the heart of the product. The rest of the stack grows around it afterward. That ordering can work. It can also leave a gap that is easy to miss. Offline metrics look fine; the live system feels less responsive than hoped. The missing piece is often not a better policy. It is a clearer belief about the latent state you are deciding under.

The same centre-of-gravity question shows up well beyond recommenders: adaptive tutors, assistants that must infer what a user wants from thin dialogue, agents acting in a partially observed world, clinical or support systems that choose interventions before the true condition is known. Wherever actions are chosen under hidden state, the architecture has to decide what object everything else reads.

## The shape of the problem

The shared shape is simple. You choose actions for someone — or something — whose true state you cannot observe directly. A learner's understanding. A user's intent. A patient's condition. An environment only seen through sensors and logs. You get clues, not the state itself. Your actions change what happens next. The outcome you care about may arrive late, sometimes months later, as a single sparse signal.

In the formal literature this is a partially observable Markov decision process: hidden state, action-dependent dynamics, delayed reward, and observations that are informative but incomplete. You do not need the formalism to build the system. You do need the partial observability to stay visible in the architecture. Otherwise noisy clues get treated as if they were the state.

I will use adaptive learning as the worked example — exam-day recall, item selection, knowledge tracing — because the structure is easy to see there. The nouns change by domain. The architectural question does not.

## Belief, not only policy

A common design puts the policy at the centre. Context goes in, an action comes out, and a reward updates the policy. Upstream of that, some estimate of the user is computed and then compressed into features.

Compression is not always a mistake. A progress bar may only need a mean. A roughly linear utility may not care much about variance. The difficulty starts when later stages *do* care how certain you are, and that certainty has already been discarded.

A simple example: two learners with the same mastery score of 0.7. For one, the estimate comes from weeks of evidence. For the other, from a handful of interactions. If both arrive at the policy as the same point value, the system has no way to treat them differently — even though one may need consolidation and the other a diagnostic step, or simply more caution.

A better centre is often the belief. By belief I mean a representation of what you currently think about the hidden state *and* how uncertain that view is. Ideally that is a posterior. In practice it is often thinner: mean and variance, conjugate parameters, an ensemble, or other sufficient statistics. The full distribution is welcome when you have it. The important habit is not to discard uncertainty at the interface only because one consumer wanted a single number.

![The belief at the centre, with policy, projection, scoring, and generation all consuming it](/images/figures/T2_belief_star.svg)
*A shared belief object, read by several consumers.*

Once that object exists, other components can read it in their own way: the policy that chooses the next action, a model that projects toward exam day, a mock scorer, a content generator. The policy is one consumer among several. Estimating the belief — with tools such as item response theory, knowledge tracing, or hierarchical priors — and checking whether decisions caused outcomes both become easier to treat as real parts of the system, rather than later add-ons.

## A simple loop

In learning systems this often looks like a loop with a few stages. Other domains have close analogues.

1. **Observe.** Turn raw activity into a clean event stream.
2. **Estimate.** Update the belief over hidden state, including some measure of uncertainty.
3. **Project.** Carry that belief forward in time — toward exam-day recall, for example, rather than only accuracy today.
4. **Decide.** Given the projected belief and the constraints, choose the next action. This is where a bandit may sit.
5. **Generate.** Produce the content that delivers the action.
6. **Act.** Deliver it, including *when*. Timing is part of the intervention.
7. **Validate.** Ask whether the decision helped, or whether the gain would have happened anyway.

![The seven-stage loop: observe, estimate, project, decide, generate, act, validate](/images/figures/T2_seven_stage_loop.svg)

The useful contract in this loop is the belief produced at estimation and carried through projection. The policy is only one stage.

## When uncertainty needs to travel

Not every consumer needs a full posterior. Some need only a point. The cost appears when a stage is sensitive to uncertainty and receives none.

Projection is one example. If a retention curve is non-linear, the expected retention under an uncertain belief is not the same as the retention of the mean ability. Projecting a point through the curve can introduce a systematic gap that grows as the belief widens. Mean and variance are often enough to approximate that; you do not necessarily need the whole density.

Exploration is another. Methods such as Thompson sampling or upper confidence bounds use uncertainty as an input. If they only see a point estimate, they tend to behave greedily. Other policies, such as ε-greedy, can explore without an explicit posterior — so this is a constraint on particular methods, not on every decision rule.

Item selection has a similar split. Some adaptive-testing rules choose items to reduce posterior uncertainty. Others, including much classical CAT, select by information at a point estimate of ability. Uncertainty helps for the first family. It is not a requirement for every selector.

Validation benefits too. If you want to know whether a policy helps uncertain users more than confident ones, some per-user measure of uncertainty has to be available in the logs.

![Projecting a point estimate through a non-linear curve is biased, and the bias grows with uncertainty](/images/figures/T2_jensen_gap.png)
*Two beliefs with the same mean can imply different expected retention under a non-linear curve.*

A practical place this gets decided early is the data model. If the UI shows a mean, it is tempting to store only `mastery FLOAT` or return `{ mastery: 0.7 }`. That is fine for display. It is limiting as the *only* contract between services, because later stages cannot recover the uncertainty you never passed them. If you still log the raw events, you can often re-estimate beliefs offline. What you cannot reconstruct as easily is the belief the policy actually saw when it chose. For that, it helps to persist at least mean and variance — or whatever sufficient statistics your estimators use — beside the point value the UI needs.

## Keeping most of the system simple

One side effect of a clear belief interface is that the rest of the system can stay plain for longer. A workable approach is to build the full loop with rules and basic logging first, then replace a stage with a learned component when measurement suggests that stage is the bottleneck. Rules at the session level, a small bandit at the item level, calibrated estimation in the middle — that kind of mix is often enough to learn from.

The interface is what makes the mix possible. If a stage consumes a belief and emits a belief or an action, a rule can later become a model without rewriting its neighbours.

## Checking decisions

Validation is easy to postpone, especially when randomisation is awkward or the stakes make experimentation feel costly. Off-policy evaluation is one way to ask what a new policy might have done on data you already collected. Inverse propensity scoring is the basic tool. Doubly-robust methods are often a sensible default, because they remain consistent if either the propensity model or the outcome model is right — though not if both are badly wrong, and not if logged actions had no overlap with the policy you want to evaluate.

In practice this depends on logging. For each decision, it helps to keep the action, its propensity under the behaviour policy, the belief that was acted on, the constraints in force, and the eventual outcome joined back by id. Without propensities, re-weighting is hard. Without the acted-on belief, differences by uncertainty are hard to study. Deterministic logging also makes propensities extreme, so some stochasticity in data collection is usually needed for these estimators to be informative.

It also helps to treat early wins gently. Pre/post movements are easy to over-interpret. A result that still looks real under a careful causal check is firmer ground than one that only looks good on a dashboard.

## Closing

Under hidden, changing state, three pieces have to work together: a belief that carries uncertainty, decisions that can use that uncertainty when they need it, and a way to check effects before you depend on them. The policy is the piece most stacks reach for first. The quieter work — representing the belief, and validating what the policy did — is usually where durable progress sits.

The claim is architectural, not algorithmic. Put the belief where the system can share it. Let the policy be one reader among several. Keep enough uncertainty in the contract that the stages which need it are not flying blind.
