// Demo content used until the AI layer lands (Gate 3), and later as a clearly-labelled fallback.
import type {
  ExplorationMode,
  Mutation,
  Question,
  QuestionResult,
  Simulation,
  SimulationInteraction,
  VisualType,
} from "@/lib/types";
import { cleanThought, shuffle, uid } from "@/lib/utils";

type MutationTemplate = Omit<Mutation, "id" | "thought" | "question"> & {
  thought: (t: string) => string;
  question: (t: string) => string;
};

const DEEPER: MutationTemplate[] = [
  {
    title: "The Borrowed Rule",
    direction: "challenge",
    visualType: "timeline",
    thought: (t) => `Maybe “${t}” is quietly obeying a rule you never agreed to.`,
    description:
      "Somewhere along the way an expectation was handed over and slowly became yours. Trace it back and see who wrote it.",
    question: () => "Who wrote the rule this thought is following?",
  },
  {
    title: "The Invisible Deadline",
    direction: "challenge",
    visualType: "timeline",
    thought: (t) => `What if “${t}” only feels urgent because of a clock nobody can actually see?`,
    description:
      "Some thoughts arrive with a timetable attached. What happens when you ask where the timetable came from?",
    question: () => "Whose clock is this thought running on?",
  },
  {
    title: "The Hidden Measuring Stick",
    direction: "possibility",
    visualType: "branching_paths",
    thought: (t) => `“${t}” is measuring something. What, and who chose the scale?`,
    description:
      "Every judgement needs a ruler. Change the ruler and the same situation can point somewhere completely different.",
    question: () => "What would this look like measured a different way?",
  },
  {
    title: "The Quiet Benefit",
    direction: "possibility",
    visualType: "branching_paths",
    thought: (t) => `What if some part of you gains something from believing “${t}”?`,
    description:
      "Thoughts that stick around often do a job. Not a comfortable idea, but a useful one to look at.",
    question: () => "What would you lose if this thought disappeared tomorrow?",
  },
  {
    title: "The First Domino",
    direction: "wildcard",
    visualType: "domino_effect",
    thought: (t) => `What if “${t}” is the end of a chain that started somewhere else entirely?`,
    description:
      "Follow it backwards, one cause at a time, until you reach something that seems to have nothing to do with it.",
    question: () => "What fell over before this thought did?",
  },
  {
    title: "The Missing Half",
    direction: "wildcard",
    visualType: "domino_effect",
    thought: (t) => `What if “${t}” is built from fragments, not the whole picture?`,
    description:
      "Our minds complete stories with whatever is nearby. What happens if you look for the pieces that were left out?",
    question: () => "What information would change this thought completely?",
  },
];

const STRANGER: MutationTemplate[] = [
  {
    title: "The Museum Label",
    direction: "possibility",
    visualType: "timeline",
    thought: (t) => `In 300 years, “${t}” sits in a museum. What does the little label underneath say?`,
    description:
      "Seen from the far future, today's ordinary thoughts look like strange artefacts of a forgotten culture.",
    question: () => "What would future people find strangest about this thought?",
  },
  {
    title: "Time Runs Backwards",
    direction: "wildcard",
    visualType: "timeline",
    thought: (t) => `What if “${t}” started at the end and was travelling back towards its beginning?`,
    description:
      "Play the thought in reverse. Endings become causes, and the first moment becomes the destination.",
    question: () => "What if the ending caused the beginning?",
  },
  {
    title: "The Inverted City",
    direction: "challenge",
    visualType: "branching_paths",
    thought: (t) => `Imagine a city where the opposite of “${t}” is the law. Who lives there?`,
    description:
      "Every road branches into a version of the world where the thought is reversed, illegal or celebrated.",
    question: () => "Who would be happiest in the inverted city?",
  },
  {
    title: "The Stranger's Thought",
    direction: "challenge",
    visualType: "branching_paths",
    thought: (t) => `What if a stranger on a train was thinking “${t}”, about you?`,
    description:
      "Move the thought into someone else's head and watch the paths it takes from there.",
    question: () => "What would you tell the stranger?",
  },
  {
    title: "The Weather System",
    direction: "wildcard",
    visualType: "domino_effect",
    thought: (t) => `What if “${t}” was a weather front moving slowly across a city?`,
    description:
      "Where it rains, what it floods, who carries umbrellas and who dances in it.",
    question: () => "Who would forecast this thought, and would anyone believe them?",
  },
  {
    title: "The Thought That Escaped",
    direction: "wildcard",
    visualType: "domino_effect",
    thought: (t) => `What if “${t}” escaped your head and started living a life of its own?`,
    description:
      "It gets a job, makes friends, influences people. Follow the chain reaction it leaves behind.",
    question: () => "Where would this thought go first if it were free?",
  },
];

const VISUAL_TYPES: VisualType[] = ["timeline", "branching_paths", "domino_effect"];

/** Three mutations, one per visual type, in random order. */
export function mockMutations(thought: string, mode: ExplorationMode): Mutation[] {
  const pool = mode === "deeper" ? DEEPER : STRANGER;
  const t = cleanThought(thought);
  return shuffle(VISUAL_TYPES).map((type) => {
    const [template] = shuffle(pool.filter((m) => m.visualType === type));
    return {
      id: uid("m-"),
      title: template.title,
      direction: template.direction,
      visualType: template.visualType,
      description: template.description,
      thought: template.thought(t),
      question: template.question(t),
    };
  });
}

function el(
  label: string,
  x: number,
  y: number,
  properties: Simulation["elements"][number]["properties"] = {},
  type: Simulation["elements"][number]["type"] = "node",
) {
  return { id: uid("e-"), type, label, x, y, properties };
}

export function mockSimulation(thought: string, mutation: Mutation, mode: ExplorationMode): Simulation {
  const atmosphere: Simulation["atmosphere"] = mode === "deeper" ? "calm" : "strange";
  const base = { id: uid("s-"), title: mutation.title, atmosphere, visualType: mutation.visualType };

  if (mutation.visualType === "timeline") {
    const milestones = [
      el("The first time you heard it", 0, 0, { setBy: "A grown-up, years ago" }),
      el("Everyone seemed to agree", 1, 0, { setBy: "The people around you" }),
      el("It became normal", 2, 0, { setBy: "Repetition" }),
      el("The thought arrives", 3, 0, { setBy: "You, today" }),
      el("What comes next?", 4, 0, { setBy: "Nobody yet" }),
    ];
    const interactions: SimulationInteraction[] = [
      {
        id: uid("i-"),
        label: "Remove “Everyone seemed to agree”",
        action: "remove",
        targetId: milestones[1].id,
        result: "Without the crowd agreeing, the rule looks much smaller and much more optional.",
      },
      {
        id: uid("i-"),
        label: "Reveal who set each milestone",
        action: "reveal",
        result: "Almost none of these moments were chosen by you.",
      },
      {
        id: uid("i-"),
        label: "Move “What comes next?” to the start",
        action: "reorder",
        targetId: milestones[4].id,
        result: "Starting from the open question changes how every other step reads.",
      },
    ];
    return {
      ...base,
      description: `A timeline of how “${cleanThought(thought)}” took shape. Change it and see what holds.`,
      elements: milestones,
      interactions,
      discoveries: [
        "Some milestones only exist because others agreed they should.",
        "The timeline was assembled long before you looked at it.",
        "An empty slot at the end is not a failure. It is room.",
      ],
    };
  }

  if (mutation.visualType === "branching_paths") {
    const start = el("Your thought", 50, 8, {}, "person");
    const destinations = [
      el("Keep believing it", 16, 86, { outcome: "Everything stays familiar, including the weight of it." }),
      el("Turn it inside out", 50, 86, { outcome: "The opposite turns out to be just as convincing." }),
      el("Hand it to someone else", 84, 86, { outcome: "In someone else's hands it looks surprisingly small." }),
    ];
    return {
      ...base,
      description: "One starting point, three paths. Each one leads to a different version of the same thought.",
      elements: [start, ...destinations],
      interactions: destinations.map((d) => ({
        id: uid("i-"),
        label: `Follow “${d.label}”`,
        action: "select" as const,
        targetId: d.id,
        result: String(d.properties.outcome),
      })),
      discoveries: [
        "No path is the correct one. Each just shows something different.",
        "The starting point looks different depending on where you end up.",
        "There were always more than three paths.",
      ],
    };
  }

  const dominoes = [
    el("The thought appears", 0, 0),
    el("A small reaction", 1, 0),
    el("It turns into a habit", 2, 0),
    el("Others start responding to it", 3, 0),
    el("The world quietly rearranges", 4, 0),
  ];
  return {
    ...base,
    description: "A chain of consequences. Push the first domino, or take one away and watch the chain change.",
    elements: dominoes.map((d) => ({ ...d, type: "object" as const })),
    interactions: [
      {
        id: uid("i-"),
        label: "Push the first domino",
        action: "trigger",
        result: "One push, and each consequence felt inevitable while it was falling.",
      },
      {
        id: uid("i-"),
        label: "Remove “It turns into a habit”",
        action: "remove",
        targetId: dominoes[2].id,
        result: "Take away the habit and the chain stops. The thought on its own was not enough.",
      },
    ],
    discoveries: [
      "Chains look inevitable only after they have fallen.",
      "One missing link can stop everything after it.",
    ],
  };
}

type QuestionTemplate = { type: Question["type"]; text: (t: string, m: Mutation) => string };

const QUESTION_POOL: QuestionTemplate[] = [
  { type: "challenging", text: (t) => `What would have to be true for “${t}” to be completely wrong?` },
  { type: "challenging", text: (_, m) => `What does “${m.title}” assume without saying it out loud?` },
  { type: "counterfactual", text: (t) => `What if nobody had ever told you “${t}” was something to worry about?` },
  { type: "counterfactual", text: () => "What would change if this happened to everyone at once?" },
  { type: "unexpected", text: () => "What would a child find funny about this?" },
  { type: "unexpected", text: (_, m) => `If “${m.title}” were a place, what would you find there?` },
  { type: "personal", text: () => "When did this thought first feel true to you?" },
  { type: "personal", text: () => "Would you still think this if nobody could see you?" },
  { type: "philosophical", text: () => "Is this a fact about the world, or a story about it?" },
  { type: "philosophical", text: () => "Who benefits when this thought goes unquestioned?" },
  { type: "counterfactual", text: () => "What if the opposite had been the rule all along?" },
  { type: "unexpected", text: () => "What would this thought look like from a hundred metres up?" },
];

export function mockQuestions(
  thought: string,
  mutation: Mutation,
  interaction?: SimulationInteraction | null,
  exclude: string[] = [],
  count = 5,
): QuestionResult {
  const t = cleanThought(thought);
  const texts = new Set(exclude);
  const questions: Question[] = [];

  if (interaction) {
    const text = `After “${interaction.label.replace(/[“”]/g, "")}”, what changed that you didn't expect?`;
    if (!texts.has(text)) questions.push({ id: uid("q-"), type: "personal", text });
  }
  if (!texts.has(mutation.question) && !interaction) {
    questions.push({ id: uid("q-"), type: "philosophical", text: mutation.question });
  }
  for (const q of shuffle(QUESTION_POOL)) {
    if (questions.length >= count) break;
    const text = q.text(t, mutation);
    if (texts.has(text) || questions.some((x) => x.text === text)) continue;
    questions.push({ id: uid("q-"), type: q.type, text });
  }

  return {
    questions,
    suggestedThought: `What if ${cleanThought(mutation.thought).replace(/^(maybe|what if)\s+/i, "").replace(/^“/, "")}?`,
  };
}
