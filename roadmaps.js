import { findResourcesForStep, getPurchaseLinksForPart } from './lib/circuitmentor_resource_library_expanded.js';

const clean = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim();

export const PATHS = {
  optimal: {
    label: 'Optimal Path', short: 'Optimal', icon: '◎', color: '#0766dc',
    promise: 'Best balance of learning, cost, speed, and safety.',
    pace: 'Balanced', theory: 'Focused', cost: '$$', estimate: '6–9 weeks'
  },
  fastest: {
    label: 'Fastest Path', short: 'Fastest', icon: '↗', color: '#11a8b5',
    promise: 'A working prototype quickly, with fewer lessons and direct build tasks.',
    pace: 'Quick', theory: 'Essential', cost: '$$–$$$', estimate: '3–5 weeks'
  },
  'lowest-cost': {
    label: 'Lowest-Cost Path', short: 'Lowest cost', icon: '◇', color: '#199266',
    promise: 'Uses owned parts, free simulators, and staged upgrades before purchases.',
    pace: 'Flexible', theory: 'Practical', cost: '$', estimate: '7–10 weeks'
  },
  'deep-learning': {
    label: 'Deep Learning Path', short: 'Deep learning', icon: '⌁', color: '#7657dc',
    promise: 'More fundamentals, official docs, practice, and skill checks.',
    pace: 'Thorough', theory: 'Deep', cost: '$$–$$$', estimate: '10–14 weeks'
  }
};

const BOARD_NAMES = ['Arduino', 'ESP32', 'Raspberry Pi Pico W', 'Raspberry Pi 4/5', 'Jetson Nano'];

export function inferSkillLevel(profile) {
  const text = clean(`${profile.hardwareExperience} ${profile.codingExperienceDetailed}`);
  if (!text || /nothing|none|never|new|beginner/.test(text)) return 'absolute beginner';
  if (/built|arduino|esp32|raspberry|python|javascript|c\+\+|sensor|breadboard/.test(text)) return 'beginner-plus';
  return 'beginner';
}

export function projectFlavor(profile) {
  const dream = clean(profile.dreamProject);
  const robot = /robot|rover|car|wheel|motor/.test(dream);
  const vision = /camera|vision|recogn|image|object|opencv|ai/.test(dream);
  const iot = /iot|wifi|internet|dashboard|remote|weather|monitor/.test(dream);
  const automation = /automat|smart home|relay|alarm|irrigat|water|plant/.test(dream);

  if (robot) return {
    key: 'robotics', label: vision ? 'vision robot' : 'robot', input: 'distance sensor', output: 'motor pair',
    inputPart: 'Ultrasonic sensor', outputParts: ['DC motors', 'Motor driver'],
    advanced: vision ? 'camera and object recognition' : 'navigation logic',
    advancedParts: vision ? ['Camera module'] : [],
    simulator: 'Wokwi or Tinkercad', action: 'stop and turn before an obstacle',
    finalBuild: vision ? 'an obstacle-avoiding rover with a camera recognition demo' : 'an obstacle-avoiding rover'
  };
  if (vision) return {
    key: 'computer vision', label: 'computer vision project', input: 'camera frame', output: 'recognition result',
    inputPart: 'Camera module', outputParts: ['LEDs'], advanced: 'OpenCV and a small classifier', advancedParts: [],
    simulator: 'a browser image notebook', action: 'identify one chosen object reliably',
    finalBuild: 'a camera prototype that recognizes a chosen object'
  };
  if (iot) return {
    key: 'iot', label: 'connected sensor', input: 'environment sensor', output: 'web dashboard',
    inputPart: 'Soil moisture sensor', outputParts: ['LEDs'], advanced: 'Wi-Fi messages and a dashboard', advancedParts: [],
    simulator: 'Wokwi', action: 'publish a reading and show its status',
    finalBuild: 'a reliable connected monitor with a simple dashboard'
  };
  if (automation) return {
    key: 'automation', label: 'automation project', input: 'trigger sensor', output: 'safe low-voltage response',
    inputPart: 'PIR motion sensor', outputParts: ['Buzzer', 'LEDs'], advanced: 'rules, timers, and fail-safe behavior', advancedParts: [],
    simulator: 'Wokwi or Tinkercad', action: 'sense a condition and trigger a safe response',
    finalBuild: 'a low-voltage automation prototype with clear fail-safe behavior'
  };
  return {
    key: 'electronics', label: 'hardware prototype', input: 'sensor or button', output: 'LED or buzzer',
    inputPart: 'PIR motion sensor', outputParts: ['LEDs', 'Buzzer'], advanced: 'reliable project integration', advancedParts: [],
    simulator: 'Wokwi or Tinkercad', action: 'read one input and control one output',
    finalBuild: 'a safe working version of the dream project'
  };
}

export function recommendBoard(profile, pathType) {
  const owned = profile.existingParts || [];
  const ownedBoard = BOARD_NAMES.find(board => owned.some(part => clean(part).includes(clean(board)) || clean(board).includes(clean(part))));
  if (ownedBoard) return ownedBoard;
  const flavor = projectFlavor(profile);
  if (pathType === 'lowest-cost') return 'Raspberry Pi Pico W';
  if (pathType === 'fastest' && flavor.key === 'computer vision') return 'Raspberry Pi 4/5';
  if (pathType === 'fastest' && flavor.key === 'robotics' && /camera|vision/.test(clean(profile.dreamProject))) return 'ESP32';
  if (flavor.key === 'iot' || flavor.key === 'automation') return 'ESP32';
  return 'Raspberry Pi Pico W';
}

function hasPart(profile, candidate) {
  const target = clean(candidate);
  return (profile.existingParts || []).some(part => {
    const owned = clean(part);
    return owned && owned !== 'none' && (owned.includes(target) || target.includes(owned));
  });
}

function partitionParts(profile, parts = []) {
  return {
    ownedPartsUsed: parts.filter(part => hasPart(profile, part)),
    missingParts: parts.filter(part => !hasPart(profile, part))
  };
}

function createStep(profile, pathType, board, data) {
  const partitioned = partitionParts(profile, data.parts || []);
  return {
    id: `${pathType}-${data.slug}`,
    pathType,
    title: data.title,
    topic: data.topic,
    whyItMatters: data.why,
    knowledgeToLearn: data.learn,
    whatToBuild: data.build,
    boardUsed: data.board || board,
    ownedPartsUsed: partitioned.ownedPartsUsed,
    missingParts: partitioned.missingParts,
    estimatedTime: data.time,
    difficulty: data.difficulty || 'Beginner',
    miniTask: data.task,
    commonMistake: data.mistake,
    safetyNote: data.safety,
    unlockCondition: data.unlock,
    safetyRisk: data.risk || 'low'
  };
}

function optimalRoadmap(profile, board, f) {
  return [
    createStep(profile, 'optimal', board, {
      slug: 'safe-simulation', title: 'Map the idea in a safe sandbox', topic: `${f.key} simulator project planning`,
      why: `A tiny model of your ${f.label} makes the full dream less mysterious before hardware is powered.`,
      learn: 'Inputs, outputs, signal flow, and how one decision becomes one action.',
      build: `A simulated input → decision → output loop in ${f.simulator}.`, parts: [], time: '45–60 min',
      task: `Draw three boxes labeled input, decision, and output for “${f.action},” then reproduce the logic in a simulator.`,
      mistake: 'Trying to simulate the entire final project instead of one decision.',
      safety: 'Keep this stage virtual. Do not connect batteries or motors yet.', unlock: 'The simulated output changes correctly for two different input values.'
    }),
    createStep(profile, 'optimal', board, {
      slug: 'board-first-signal', title: `Make ${board} produce a first signal`, topic: `${board} GPIO LED breadboard`,
      why: 'A first controlled output proves the board, code, cable, and toolchain all work.',
      learn: 'Board power, GPIO pins, digital output, upload/run flow, and polarity.',
      build: 'A blinking LED with a deliberate slow/fast pattern.', parts: [board, 'Breadboard', 'LEDs', 'Resistors', 'Jumper wires'], time: '60–90 min',
      task: 'Create a three-blink “ready” signal and explain why the LED needs a resistor.',
      mistake: 'Connecting an LED without a resistor or choosing a pin by appearance alone.',
      safety: 'Disconnect power before moving wires. Confirm pin labels and LED polarity.', unlock: 'The board repeats the intended pattern after a fresh restart.'
    }),
    createStep(profile, 'optimal', board, {
      slug: 'sense-world', title: `Teach the project to read its ${f.input}`, topic: `${board} ${f.input} sensor input`,
      why: `Your dream project cannot ${f.action} until it can read a useful input consistently.`,
      learn: 'Sensor pins, units, sampling, noisy readings, and threshold choices.',
      build: `A serial readout or simulator panel for the ${f.input}.`, parts: [board, f.inputPart, 'Breadboard', 'Jumper wires'], time: '1.5–2 hr',
      task: 'Record ten readings in two conditions and choose a threshold that separates them.',
      mistake: 'Trusting one reading instead of checking a small series.',
      safety: 'Check the sensor voltage and pin order before power. Never hot-swap sensor wires.', unlock: 'Ten readings are visible and the chosen threshold is explained.'
    }),
    createStep(profile, 'optimal', board, {
      slug: 'safe-output', title: `Control the ${f.output} without risking the board`, topic: `${board} ${f.output} PWM driver power`,
      why: 'Outputs often draw more current than a GPIO pin can safely provide.',
      learn: 'Driver stages, external power, common ground, PWM, and stop states.',
      build: `A bench test that controls the ${f.output} separately from the full project.`, parts: [board, ...f.outputParts, 'Jumper wires', ...(f.key === 'robotics' ? ['Battery pack'] : [])], time: '2–3 hr',
      task: `Run the ${f.output} at a gentle setting, stop it in code, then prove the default power-up state is safe.`,
      mistake: 'Powering a motor, buzzer, or other load directly from a GPIO pin.',
      safety: 'Human wiring review required before external power, motors, batteries, or unfamiliar loads.', unlock: 'An experienced reviewer checks the driver and power path before the output is powered.', risk: f.key === 'robotics' ? 'high' : 'medium'
    }),
    createStep(profile, 'optimal', board, {
      slug: 'decision-loop', title: 'Join sensing and action with a state machine', topic: `${f.key} state machine sensor output logic`,
      why: 'A readable state machine keeps the project predictable when conditions change.',
      learn: 'States, transitions, timing without blocking, and a fail-safe default.',
      build: `A three-state controller that can ${f.action}.`, parts: [board, f.inputPart, ...f.outputParts], time: '2–3 hr',
      task: 'Name each state, write its entry condition, and add a visible safe-stop state.',
      mistake: 'Burying every behavior inside one long if/else chain.',
      safety: 'Test with the high-current output disconnected first; observe logic through LEDs or serial messages.', unlock: 'Every state can be triggered on the bench and the safe-stop state always wins.'
    }),
    createStep(profile, 'optimal', board, {
      slug: 'advanced-preview', title: `Preview ${f.advanced} on its own`, topic: `${f.key} ${f.advanced} beginner demo`,
      why: 'The advanced feature is easier to debug as a separate demonstration than inside the full build.',
      learn: 'The minimum toolchain and data flow needed for the dream feature.',
      build: `A small, isolated ${f.advanced} demonstration.`, parts: [...f.advancedParts], time: '2–4 hr',
      task: 'Run one known example, change one parameter, and write what changed and why.',
      mistake: 'Installing many libraries at once without saving a known-working example.',
      safety: 'Use a USB-powered or simulated setup. Do not add motor power during this lesson.', unlock: 'The isolated demo works twice from a clean restart.'
    }),
    createStep(profile, 'optimal', board, {
      slug: 'integrate', title: 'Integrate one feature at a time', topic: `${f.key} hardware software integration debugging`,
      why: 'Incremental integration shows exactly which new connection or code change caused a failure.',
      learn: 'Integration order, interface contracts, logs, and rollback points.',
      build: `A staged version of ${f.finalBuild}.`, parts: [board, f.inputPart, ...f.outputParts, ...f.advancedParts], time: '3–5 hr',
      task: 'Create a three-column test log: change made, expected result, observed result.',
      mistake: 'Connecting every subsystem before testing any pair together.',
      safety: 'Keep the project lifted or outputs unloaded during bench tests. Review power wiring again.', unlock: 'Each subsystem passes alone and in one paired integration test.', risk: f.key === 'robotics' ? 'high' : 'medium'
    }),
    createStep(profile, 'optimal', board, {
      slug: 'final-build', title: 'Build, test, and explain the dream', topic: `${f.key} final project testing safety`,
      why: 'A finished project is one you can test, explain, and shut down safely—not merely power on once.',
      learn: 'Acceptance tests, edge cases, documentation, and safe operating limits.',
      build: f.finalBuild, parts: [board, f.inputPart, ...f.outputParts, ...f.advancedParts], time: '4–6 hr',
      task: 'Run five written tests, including loss of input and emergency stop, then record a 60-second explanation.',
      mistake: 'Calling the first successful run “finished” without repeating tests.',
      safety: 'Final human review required before free movement, battery operation, soldering, or extended unattended use.', unlock: 'A reviewer signs the mentor checklist and all five tests have recorded results.', risk: 'high'
    })
  ];
}

function fastestRoadmap(profile, board, f) {
  return [
    createStep(profile, 'fastest', board, {
      slug: 'simulate-core', title: 'Simulate the core behavior first', topic: `${f.key} fast prototype simulator`,
      why: 'The fastest useful route proves the central behavior before buying or wiring.', learn: 'The single input and output that define a minimum viable prototype.',
      build: `A virtual proof that can ${f.action}.`, parts: [], time: '30–45 min',
      task: 'Make one threshold trigger one visible output and save a screenshot of both conditions.',
      mistake: 'Adding menus, dashboards, or AI before the core response works.', safety: 'Stay in the simulator for this sprint.', unlock: 'The virtual response works in both the trigger and no-trigger condition.'
    }),
    createStep(profile, 'fastest', board, {
      slug: 'board-and-input', title: `Flash ${board} and read the ${f.input}`, topic: `${board} ${f.input} quick start`,
      why: 'Combining setup and input reading removes a separate “hello world” stage.', learn: 'Only the upload flow, pin mapping, and readings needed for the prototype.',
      build: `A live ${f.input} readout with a working threshold.`, parts: [board, f.inputPart, 'Breadboard', 'Jumper wires'], time: '1–2 hr',
      task: 'Print the reading and the words READY or ACT whenever the threshold changes.',
      mistake: 'Copying pin numbers from a tutorial for a different board.', safety: 'Check board and sensor voltage before connecting power.', unlock: 'The board reports stable readings and the threshold changes correctly.'
    }),
    createStep(profile, 'fastest', board, {
      slug: 'output-bench', title: `Bench-test the ${f.output}`, topic: `${board} ${f.output} driver quick prototype`,
      why: 'A short isolated output test prevents the integrated prototype from failing mysteriously.', learn: 'Driver connection, simple control, and emergency stop.',
      build: `A low-speed or low-power ${f.output} test.`, parts: [board, ...f.outputParts, ...(f.key === 'robotics' ? ['Battery pack'] : [])], time: '1.5–2 hr',
      task: 'Start, change the setting once, stop, and prove reset leaves the output off.',
      mistake: 'Skipping the driver or external power check to save time.', safety: 'Human review needed before motors, batteries, high current, or unfamiliar loads are powered.', unlock: 'The wiring is reviewed and reset reliably produces an off state.', risk: f.key === 'robotics' ? 'high' : 'medium'
    }),
    createStep(profile, 'fastest', board, {
      slug: 'prototype', title: `Build the first working ${f.label} prototype`, topic: `${f.key} minimum viable prototype`,
      why: 'This is the shortest path to a tangible win and reveals the most important next problem.', learn: 'A compact sense–decide–act loop and one fail-safe.',
      build: `A prototype that can ${f.action}.`, parts: [board, f.inputPart, ...f.outputParts], time: '2–3 hr',
      task: 'Complete three repeatable trials and write down only the first failure you observe.',
      mistake: 'Tuning several variables after one successful trial.', safety: 'Test on a bench with outputs unloaded or restrained; keep a physical power disconnect reachable.', unlock: 'Three consecutive trials pass with the same threshold and code.', risk: f.key === 'robotics' ? 'high' : 'medium'
    }),
    createStep(profile, 'fastest', board, {
      slug: 'advanced-early', title: `Run a direct ${f.advanced} demo`, topic: `${f.advanced} quickstart demo`,
      why: 'The dream feature appears early in this route so you can validate that it is worth integrating.', learn: 'How to run and slightly modify one trusted example.',
      build: `A standalone ${f.advanced} demo using sample data or USB power.`, parts: [...f.advancedParts], time: '1.5–3 hr',
      task: 'Change one input, label, or rule and explain the output change.', mistake: 'Treating a copied demo as understood without changing it.',
      safety: 'Keep this subsystem separate from motor or battery power.', unlock: 'The changed demo works twice and you can name its input and output.'
    }),
    createStep(profile, 'fastest', board, {
      slug: 'mvp', title: 'Stitch the minimum viable project together', topic: `${f.key} rapid integration test`,
      why: 'The route ends with a deliberately small, working version—not a half-built feature list.', learn: 'Minimal integration, smoke tests, and what to postpone.',
      build: f.finalBuild, parts: [board, f.inputPart, ...f.outputParts, ...f.advancedParts], time: '3–5 hr',
      task: 'Choose exactly three must-pass tests and move every extra idea to an “upgrade later” list.',
      mistake: 'Expanding scope during final integration.', safety: 'Human review is required before final power, motion, battery use, soldering, or unclear wiring.', unlock: 'The three MVP tests pass after a cold restart and a human completes the checklist.', risk: 'high'
    })
  ];
}

function lowestCostRoadmap(profile, board, f) {
  const ownedText = (profile.existingParts || []).filter(p => clean(p) !== 'none').join(', ') || 'no listed parts yet';
  return [
    createStep(profile, 'lowest-cost', board, {
      slug: 'inventory', title: 'Turn your parts drawer into a plan', topic: `${f.key} parts inventory budget planning`,
      why: `Starting with what you own (${ownedText}) prevents a shopping list from driving the design.`, learn: 'Part identification, voltage labels, compatibility, and required versus optional.',
      build: 'A photographed or written inventory with four labels: Owned, Needed, Optional, Upgrade later.', parts: [], time: '30–45 min',
      task: 'Write the exact marking on each board and sensor; do not identify a part only by color.', mistake: 'Assuming look-alike modules use the same voltage or pin order.',
      safety: 'Do not test unknown parts with power. Identify them first.', unlock: 'Every planned part has a readable name or model number.'
    }),
    createStep(profile, 'lowest-cost', board, {
      slug: 'free-simulator', title: 'Build the first version for $0', topic: `${f.simulator} ${f.key} free simulation`,
      why: 'Simulation buys learning time without spending the project budget.', learn: 'Signal flow, thresholds, logic, and which physical parts are truly necessary.',
      build: `A free simulated loop that can ${f.action}.`, parts: [], time: '60–90 min',
      task: 'Simulate three input values and record the output for each.', mistake: 'Buying a part because a tutorial uses it, rather than because the project needs it.',
      safety: 'This virtual step has no wiring risk.', unlock: 'The simulated behavior works and you can name the minimum physical parts.'
    }),
    createStep(profile, 'lowest-cost', board, {
      slug: 'owned-board', title: `Learn with ${hasPart(profile, board) ? 'your' : 'one low-cost'} ${board}`, topic: `${board} low cost beginner GPIO`,
      why: `${hasPart(profile, board) ? 'Using the board you already own keeps new spending at zero.' : `${board} keeps the entry cost low and can be reused later.`}`, learn: 'Only the board setup, one input, and one output needed for the project.',
      build: 'A single-board input/output test.', parts: [board, 'Breadboard', 'LEDs', 'Resistors', 'Jumper wires'], time: '1–2 hr',
      task: 'Use one input to change an LED or serial message.', mistake: 'Replacing an owned board just because a guide shows another one.',
      safety: 'Use USB power only and disconnect it before rewiring.', unlock: 'The same small program works after reconnecting USB.'
    }),
    createStep(profile, 'lowest-cost', board, {
      slug: 'reuse-input', title: `Prove the ${f.input} before buying upgrades`, topic: `${board} ${f.input} budget sensor`,
      why: 'One dependable input is more valuable than several unopened modules.', learn: 'Reading, calibration, and whether a cheaper or owned sensor is sufficient.',
      build: `A calibrated ${f.input} test, simulated if the part is not owned.`, parts: [board, f.inputPart], time: '1.5–2 hr',
      task: 'Compare ten readings and decide: use, substitute, or buy—with one sentence of evidence.', mistake: 'Buying a more expensive sensor before measuring the available one.',
      safety: 'Verify sensor voltage and pin labels; simulate first if identification is uncertain.', unlock: 'A use/substitute/buy decision is supported by readings or simulator evidence.'
    }),
    createStep(profile, 'lowest-cost', board, {
      slug: 'staged-output', title: `Stage the ${f.output} without a full purchase`, topic: `${f.output} low cost driver simulator`,
      why: 'A virtual or single-output test delays multi-part spending until the control logic is proven.', learn: 'Driver requirements, power budget, and a safe stop state.',
      build: `A simulated or one-channel ${f.output} test.`, parts: hasPart(profile, f.outputParts[0]) ? [board, ...f.outputParts] : [], time: '1.5–2.5 hr',
      task: 'Calculate or look up the required driver and voltage before adding anything to the cart.', mistake: 'Buying motors or loads without budgeting for the correct driver and power source.',
      safety: 'Do not connect motors, batteries, or higher-current loads without an experienced wiring review.', unlock: 'The control logic is proven virtually and the power requirements are written down.', risk: 'medium'
    }),
    createStep(profile, 'lowest-cost', board, {
      slug: 'core-build', title: 'Build the useful core before the dream upgrade', topic: `${f.key} budget core prototype`,
      why: `A working core that can ${f.action} gives value before optional ${f.advanced} spending.`, learn: 'Core integration, repeatable tests, and upgrade boundaries.',
      build: `A core ${f.label} without optional upgrades.`, parts: [board, f.inputPart, ...f.outputParts], time: '3–4 hr',
      task: 'Pass three core-behavior tests and create an “upgrade later” connector or code interface.', mistake: 'Treating the advanced feature as required for the first useful version.',
      safety: 'Human review before powering external loads. Keep the build on a stable bench.', unlock: 'The core passes three tests without the optional upgrade.', risk: f.key === 'robotics' ? 'high' : 'medium'
    }),
    createStep(profile, 'lowest-cost', board, {
      slug: 'free-advanced', title: `Try ${f.advanced} with free tools`, topic: `${f.advanced} free browser laptop demo`,
      why: 'A sample, browser tool, simulator, or existing laptop can validate the upgrade before dedicated hardware.', learn: 'The upgrade workflow and its real performance needs.',
      build: `A no-new-hardware ${f.advanced} proof of concept.`, parts: [], time: '2–3 hr',
      task: 'Run the feature on sample data and write whether dedicated hardware is Needed, Optional, or Upgrade later.', mistake: 'Assuming an expensive board is necessary before measuring the free proof of concept.',
      safety: 'Keep external power and moving hardware disconnected.', unlock: 'The upgrade is classified with a reason and estimated cost.'
    }),
    createStep(profile, 'lowest-cost', board, {
      slug: 'budget-finish', title: 'Finish the smallest satisfying version', topic: `${f.key} low cost final build test`,
      why: 'The lowest-cost finish line is defined by useful behavior, not by owning every possible component.', learn: 'Budget tradeoffs, final tests, and a staged upgrade plan.',
      build: f.finalBuild, parts: [board, f.inputPart, ...f.outputParts], time: '4–6 hr',
      task: 'Demonstrate the useful core and list upgrades in priority order with a maximum future spend.', mistake: 'Adding “nice to have” purchases before the current build is reliable.',
      safety: 'Human review before final power, motion, battery use, soldering, or any uncertain wiring.', unlock: 'The core passes five tests and required wiring has been reviewed.', risk: 'high'
    })
  ];
}

function deepLearningRoadmap(profile, board, f) {
  return [
    createStep(profile, 'deep-learning', board, {
      slug: 'electricity', title: 'Understand the energy in every wire', topic: 'voltage current resistance Ohms law circuits',
      why: 'Voltage, current, and resistance explain both why circuits work and how parts get damaged.', learn: 'Closed circuits, voltage, current, resistance, power, and Ohm’s law.',
      build: 'Three calculated LED circuits, then one simulated circuit.', parts: [], time: '2–3 hr', task: 'Calculate a safe LED resistor for one common supply and verify it in a simulator.',
      mistake: 'Thinking a power supply “pushes” the same current through every component.', safety: 'Use simulation until voltage, polarity, and current limiting make sense.', unlock: 'You can explain why a resistor protects an LED and check one calculation.'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'breadboard-measure', title: 'Read breadboards, schematics, and measurements', topic: 'breadboard schematic multimeter continuity',
      why: 'Being able to trace and measure a circuit turns wiring from guesswork into evidence.', learn: 'Breadboard rails, schematic symbols, continuity, voltage measurement, and polarity.',
      build: 'A low-voltage LED circuit that matches a hand-drawn schematic.', parts: ['Breadboard', 'LEDs', 'Resistors', 'Jumper wires'], time: '2–3 hr', task: 'Trace each electrical node on paper before placing a wire.',
      mistake: 'Treating every hole in a breadboard row as isolated.', safety: 'Measure resistance or continuity only with circuit power disconnected.', unlock: 'The drawn nodes match the breadboard and polarity is labeled.'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'code-model', title: 'Model behavior before writing hardware code', topic: `${f.key} programming variables functions state machine`,
      why: 'Clear logic is portable across boards and easier to debug than hardware-specific code.', learn: 'Variables, functions, conditionals, loops, timing, and state machines.',
      build: `A text-only program that models how the project will ${f.action}.`, parts: [], time: '2–4 hr', task: 'Write separate readInput, decide, and act functions and test three cases.',
      mistake: 'Mixing sensor reading, decisions, and output code in one block.', safety: 'No hardware is needed for this step.', unlock: 'All three test cases produce the expected state.'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'board-architecture', title: `Learn how ${board} thinks`, topic: `${board} architecture GPIO voltage official documentation`,
      why: 'Understanding pins, voltage levels, memory, and timing prevents fragile copy-and-paste builds.', learn: 'Board architecture, GPIO modes, voltage limits, pin maps, and the toolchain.',
      build: 'A documented LED and button experiment using constants and functions.', parts: [board, 'Breadboard', 'LEDs', 'Resistors', 'Jumper wires'], time: '2–3 hr', task: 'Annotate the exact pins and voltage level used, citing the board documentation.',
      mistake: 'Following the pinout of a similar-looking but different board.', safety: 'Disconnect USB before rewiring and never exceed documented GPIO voltage.', unlock: 'The circuit restarts reliably and every used pin is documented.'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'sensor-science', title: `Measure and calibrate the ${f.input}`, topic: `${board} ${f.input} calibration noise sampling`,
      why: 'Calibration separates a robust project from one tuned to a single lucky test.', learn: 'Sampling rate, noise, outliers, filtering, units, and threshold hysteresis.',
      build: `A small dataset and calibrated reader for the ${f.input}.`, parts: [board, f.inputPart, 'Breadboard', 'Jumper wires'], time: '3–4 hr', task: 'Collect at least 30 readings, mark outliers, and compare raw versus averaged data.',
      mistake: 'Choosing a threshold from one or two measurements.', safety: 'Confirm pin order and voltage from the exact module documentation.', unlock: 'The threshold works across at least three test conditions.'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'output-engineering', title: `Engineer the ${f.output} power path`, topic: `${f.output} driver transistor PWM current power supply`,
      why: 'Loads and motors are power systems, not merely another GPIO connection.', learn: 'Current demand, drivers, flyback protection, PWM, common ground, and separate supplies.',
      build: `A documented, current-limited bench test of the ${f.output}.`, parts: [board, ...f.outputParts, ...(f.key === 'robotics' ? ['Battery pack'] : [])], time: '3–5 hr', task: 'Draw the signal path and power path in different colors before wiring.',
      mistake: 'Routing load current through the microcontroller or omitting protection components.', safety: 'Human review is mandatory before powering motors, batteries, high current, soldered wiring, or unknown loads.', unlock: 'A reviewer checks the diagram and physical wiring before power.', risk: 'high'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'closed-loop', title: 'Build a testable closed-loop controller', topic: `${f.key} closed loop state machine nonblocking timing`,
      why: 'The project must repeatedly sense, decide, act, and recover—not only respond once.', learn: 'Closed-loop control, nonblocking timing, state transitions, and fault states.',
      build: `A controller that can ${f.action} across repeated trials.`, parts: [board, f.inputPart, ...f.outputParts], time: '4–6 hr', task: 'Create a state-transition table and test every transition separately.',
      mistake: 'Using long delays that stop sensing while an action runs.', safety: 'Test logic with outputs disconnected, then use restrained or low-power output tests.', unlock: 'Every state and transition passes a named test.', risk: f.key === 'robotics' ? 'high' : 'medium'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'system-debug', title: 'Learn systematic hardware debugging', topic: `${f.key} debugging logging multimeter fault isolation`,
      why: 'A debugging method prevents random rewiring and protects working subsystems.', learn: 'Divide-and-conquer tests, logs, known-good baselines, and one-change-at-a-time discipline.',
      build: 'A fault-injection worksheet with three intentional, safe software faults.', parts: [board, f.inputPart, ...f.outputParts], time: '2–3 hr', task: 'Introduce one harmless code fault, diagnose it from evidence, then restore the baseline.',
      mistake: 'Changing code and wiring simultaneously.', safety: 'Inject software faults only; never create shorts, reversed power, or overloaded outputs.', unlock: 'Three faults are diagnosed with evidence and without random rewiring.'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'advanced-foundations', title: `Learn the foundations behind ${f.advanced}`, topic: `${f.advanced} fundamentals official documentation`,
      why: 'Knowing the underlying data flow makes advanced examples adaptable to your real dream.', learn: 'Inputs, preprocessing, algorithm or rule output, confidence, and limitations.',
      build: `A notebook, diagram, or isolated demo explaining ${f.advanced}.`, parts: [...f.advancedParts], time: '3–5 hr', task: 'Trace one example from raw input to final output and explain each transformation.',
      mistake: 'Treating a library result as magic or assuming one demo generalizes.', safety: 'Use sample data or USB power; keep high-current hardware disconnected.', unlock: 'You can explain the demo’s input, transformation, output, and one limitation.'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'advanced-practice', title: `Practice ${f.advanced} on varied inputs`, topic: `${f.advanced} dataset testing validation`,
      why: 'Varied tests expose false positives, edge cases, and environmental limits before integration.', learn: 'Test sets, false positives, confidence, environmental variation, and performance.',
      build: `A ten-case test report for the ${f.advanced} demo.`, parts: [...f.advancedParts], time: '3–5 hr', task: 'Test ten varied cases, including two you expect to fail, and record all results.',
      mistake: 'Testing only the easy example used during setup.', safety: 'Keep the advanced subsystem isolated from moving or high-current hardware.', unlock: 'All ten cases are recorded and at least one limitation is named.'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'architecture', title: 'Design the complete system before integration', topic: `${f.key} system architecture interfaces power budget`,
      why: 'A system diagram reveals incompatible voltage, duplicated responsibilities, and hidden power needs early.', learn: 'Subsystem boundaries, interfaces, data rate, power budget, and failure behavior.',
      build: `A complete architecture diagram for ${f.finalBuild}.`, parts: [board, f.inputPart, ...f.outputParts, ...f.advancedParts], time: '2–4 hr', task: 'Label every arrow as power, analog, digital, serial, wireless, or mechanical.',
      mistake: 'Drawing components without showing which direction data and power move.', safety: 'Have an experienced reviewer inspect the power budget and connector plan.', unlock: 'Every subsystem has power, data, and a safe failure state documented.', risk: 'medium'
    }),
    createStep(profile, 'deep-learning', board, {
      slug: 'capstone', title: 'Build and defend the capstone', topic: `${f.key} capstone integration verification safety`,
      why: 'Deep learning ends with evidence: a repeatable build, documented reasoning, and known limitations.', learn: 'Staged integration, verification, documentation, and communication.',
      build: f.finalBuild, parts: [board, f.inputPart, ...f.outputParts, ...f.advancedParts], time: '6–10 hr', task: 'Run a ten-test verification plan and explain one design tradeoff, one failure, and one safety limit.',
      mistake: 'Hiding failed tests instead of using them to define the next revision.', safety: 'Final human review required before power, motion, batteries, soldering, high current, wall power, or unclear wiring.', unlock: 'The mentor checklist is signed and all ten results—including failures—are documented.', risk: 'high'
    })
  ];
}

export function buildQuizBank(step, profile) {
  const resource = step.resources?.[0]?.title || 'the first matching resource';
  return [
    {
      question: `Why does “${step.title}” belong in your ${PATHS[step.pathType].short.toLowerCase()} route?`,
      options: [step.whyItMatters, 'It is included in every electronics kit.', 'It removes the need to test later.', 'It guarantees the final wiring is safe.'], correct: 0,
      explanation: `This step exists because ${step.whyItMatters.toLowerCase()}`,
      example: `For your project, the evidence is the mini task: ${step.miniTask}`,
      easier: `In one phrase, what does this step help the final project do?`, resource
    },
    {
      question: `Which board or environment is used for this exact step?`,
      options: ['Any board shown in a random video', 'Wall-powered equipment', step.boardUsed, 'A board must always be purchased new'], correct: 2,
      explanation: `${step.boardUsed} is the environment selected for this step and the resource matches are scored against it.`,
      example: `Pin names and voltage can differ, so the ${step.boardUsed} documentation matters.`,
      easier: `Read the “Board” fact above. What does it say?`, resource
    },
    {
      question: `What evidence unlocks the next step?`,
      options: ['Feeling ready', 'Buying every optional part', 'Watching one video', step.unlockCondition], correct: 3,
      explanation: `The unlock condition is observable evidence: ${step.unlockCondition}`,
      example: 'A repeatable result is stronger evidence than one lucky run.',
      easier: `Should one lucky result unlock a hardware step?`, resource
    },
    {
      question: `Which action best avoids this step’s common mistake?`,
      options: [`Plan around this warning: ${step.commonMistake}`, 'Change several things at once', 'Skip notes and copy the full build', 'Power the circuit before checking'], correct: 0,
      explanation: `The roadmap calls out this exact mistake: ${step.commonMistake}`,
      example: 'Change one variable, write the result, then decide the next change.',
      easier: `Is changing code and wiring together easier or harder to diagnose?`, resource
    },
    {
      question: `What is the safest next action for this step?`,
      options: ['Assume low voltage means zero risk', step.safetyNote, 'Ask an AI to certify the wiring', 'Ignore part labels if the connector fits'], correct: 1,
      explanation: `The step-specific safety rule is: ${step.safetyNote}`,
      example: 'A review occurs before power, not after a component becomes hot.',
      easier: `Should unclear wiring be powered before or after human review?`, resource
    },
    {
      question: `What should you build before moving on?`,
      options: ['The entire dream project at once', 'A shopping cart', step.whatToBuild, 'A presentation with no test'], correct: 2,
      explanation: `This lesson’s intentionally small build is: ${step.whatToBuild}`,
      example: `The mini task is the smallest proof: ${step.miniTask}`,
      easier: `Is the build for this step small and testable, or the whole project?`, resource
    },
    {
      question: `Which learning goal is specific to “${step.title}”?`,
      options: ['Memorize every board ever made', step.knowledgeToLearn, 'Skip fundamentals to save time', 'Guarantee there will be no failures'], correct: 1,
      explanation: `The stated learning target is: ${step.knowledgeToLearn}`,
      example: 'You only need enough theory to explain and repeat the mini build.',
      easier: `Look at “What you’ll learn.” Which option matches it?`, resource
    },
    {
      question: `How should you use the resource “${resource}”?`,
      options: ['Copy every advanced section immediately', 'Treat it as proof that wiring is certified', 'Focus on the topic and mini task for this step', 'Buy every part it mentions'], correct: 2,
      explanation: 'Resources are filtered for the step, but you should focus only on the parts that support the current learning goal.',
      example: `Read for ${step.topic}, then perform the mini task.`,
      easier: `Should you study the current topic or every advanced topic?`, resource
    },
    {
      question: `What is a good debugging habit during this step?`,
      options: ['Make one change and record the observed result', 'Replace the board first', 'Remove all safety checks', 'Change the code, wiring, and power source together'], correct: 0,
      explanation: 'One change at a time preserves evidence about cause and effect.',
      example: `If ${step.commonMistake.toLowerCase()}, return to the last known-working state.`,
      easier: `Which is easier to diagnose: one change or four changes?`, resource
    },
    {
      question: `For a ${profile.skillLevel || 'beginner'}, when is this skill ready to use in the project?`,
      options: ['After reading the title', 'After buying an upgrade', 'When a video ends', `When this is true: ${step.unlockCondition}`], correct: 3,
      explanation: 'CircuitMentor uses a visible unlock condition, not confidence alone.',
      example: 'Repeat, observe, and explain the result before adding another subsystem.',
      easier: `Does confidence alone prove a circuit works?`, resource
    }
  ];
}

export function generateRoadmap(profile, selectedPathType) {
  const board = recommendBoard(profile, selectedPathType);
  const flavor = projectFlavor(profile);
  const profileForResources = { ...profile, selectedPathType, recommendedBoard: board };
  let raw;
  if (selectedPathType === 'fastest') raw = fastestRoadmap(profileForResources, board, flavor);
  else if (selectedPathType === 'lowest-cost') raw = lowestCostRoadmap(profileForResources, board, flavor);
  else if (selectedPathType === 'deep-learning') raw = deepLearningRoadmap(profileForResources, board, flavor);
  else raw = optimalRoadmap(profileForResources, board, flavor);

  const steps = raw.map((step, index) => {
    const enriched = {
      ...step,
      resources: findResourcesForStep(step, profileForResources, 4),
      nextStep: raw[index + 1]?.title || 'Final project reflection and your next upgrade'
    };
    enriched.quiz = buildQuizBank(enriched, { ...profileForResources, skillLevel: profile.skillLevel });
    return enriched;
  });

  return {
    pathType: selectedPathType,
    recommendedBoard: board,
    steps,
    flavor,
    ...estimateRoadmap(profileForResources, selectedPathType, steps)
  };
}

function estimateRoadmap(profile, pathType, steps) {
  const path = PATHS[pathType];
  const ownedBoard = hasPart(profile, profile.recommendedBoard);
  const budgetCaps = { 'Under $25': 25, '$25–$50': 50, '$50–$100': 100, '$100+': 160, 'Use only what I own': 0 };
  const missing = new Set(steps.flatMap(step => step.missingParts));
  let base = [...missing].reduce((sum, part) => sum + priceInfo(part).mid, 0);
  if (pathType === 'lowest-cost') base *= .55;
  if (pathType === 'fastest') base *= 1.05;
  if (ownedBoard) base = Math.max(0, base - priceInfo(profile.recommendedBoard).mid);
  const cap = budgetCaps[profile.budget] ?? 50;
  const estimate = cap === 0 ? '$0 now' : `$${Math.max(0, Math.floor(base * .75))}–$${Math.max(5, Math.ceil(base * 1.2))}`;
  return { estimatedTime: path.estimate, estimatedCost: estimate, budgetFit: cap === 0 ? 'Simulator-first' : base <= cap ? 'Within target' : 'Staged purchases' };
}

const PRICE_DATA = {
  'raspberry pi pico w': [6, 9], 'esp32': [8, 16], 'arduino': [18, 30], 'raspberry pi 4/5': [60, 100], 'jetson nano': [120, 180],
  'breadboard': [5, 10], 'leds': [3, 8], 'resistors': [3, 8], 'jumper wires': [4, 9], 'ultrasonic sensor': [3, 9],
  'pir motion sensor': [4, 10], 'soil moisture sensor': [5, 15], 'servo motor': [6, 14], 'dc motors': [8, 20],
  'motor driver': [5, 14], 'camera module': [12, 35], 'buzzer': [2, 6], 'battery pack': [8, 20]
};

export function priceInfo(part) {
  const found = Object.entries(PRICE_DATA).find(([key]) => clean(part).includes(key) || key.includes(clean(part)));
  const [low, high] = found?.[1] || [5, 20];
  return { low, high, mid: (low + high) / 2, label: `$${low}–$${high}` };
}

export function buildPartsList(profile, roadmap) {
  const required = [];
  roadmap.steps.forEach(step => step.missingParts.forEach(part => {
    if (!hasPart(profile, part) && !required.some(item => clean(item.partName) === clean(part))) {
      const price = priceInfo(part);
      required.push({
        partName: part, quantity: /motor/.test(clean(part)) && !/driver/.test(clean(part)) ? 2 : 1,
        status: 'Needed', required: true, estimatedPrice: price.label,
        whyNeeded: `Used in “${step.title}” for ${step.whatToBuild.toLowerCase()}.`,
        compatibleBoard: roadmap.recommendedBoard,
        safetyNote: /battery|motor|driver/.test(clean(part)) ? 'Confirm voltage/current and ask an experienced builder to review the power path.' : 'Verify the exact model, voltage, and pinout before connecting.',
        links: getPurchaseLinksForPart(part)
      });
    }
  }));

  const optional = roadmap.flavor.advancedParts.filter(part => !hasPart(profile, part) && !required.some(item => clean(item.partName) === clean(part))).map(part => ({
    partName: part, quantity: 1, status: roadmap.pathType === 'lowest-cost' ? 'Upgrade later' : 'Optional', required: false,
    estimatedPrice: priceInfo(part).label, whyNeeded: `Optional hardware for ${roadmap.flavor.advanced}; validate the free demo first.`,
    compatibleBoard: roadmap.recommendedBoard, safetyNote: 'Verify compatibility before purchase; this is not required for the first core build.', links: getPurchaseLinksForPart(part)
  }));
  return [...required, ...optional];
}
