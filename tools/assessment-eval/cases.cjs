// Designed recordings. Prompt for all: "Talk about a place you love."
// Several cases are the STRONG answer with ONE thing changed, so any score
// difference has a single cause.
const STRONG = `My favourite place is the old library near my school. It is a quiet building with tall windows and creaky wooden floors. I love it for two reasons. First, it gives me space to think, because at home there is always noise. Second, the librarian, Mrs Iyer, recommends books that I would never choose myself, and some of them have changed how I see the world. Last month she gave me a novel about a girl growing up in Kerala, and I finished it in two evenings. So for me, the library is not just a room full of books. It is the place where I became curious.`;

// Same answer, four ordinary, correct uses of words the app treats as fillers.
const STRONG_LIKE = STRONG
  .replace('I love it for two reasons.', 'I like it for two reasons.')
  .replace('recommends books that I would never choose myself', 'recommends the kind of books I would never choose myself, like poetry')
  .replace('and I finished it in two evenings.', 'and I actually finished it in two evenings.');

// Same content as STRONG, rewritten with typical learner grammar errors.
const GRAMMAR = `My favourite place are the old library near my school. It have tall windows and creaky wooden floor. I am loving it for two reason. First, it give me space for think, because in home there is always noise. Second, the librarian, Mrs Iyer, recommend books which I never choosing myself, and some of them has changed how I am seeing the world. Last month she gived me one novel about a girl who grow up in Kerala, and I am finishing it in two evening. So for me, library is not only a room full of book. It is the place where I become curious.`;

const AVERAGE = `Um, my favourite place is the park near my house. It is very nice and green. I go there with my friends in the evening and we play cricket. Uh, I like it because it is peaceful and there are many trees. Sometimes I just sit and, um, watch people walking. It is my favourite place because I feel happy there.`;

const WEAK = `Um, my place is, uh, my house. Um, my house is good. It is good because, uh, it is my house. Like, I like my house. Uh, you know, my room is there. Um, it is nice. My house is nice. Uh, that's it.`;

const OFF_TOPIC = `Cricket is the most popular sport in India and it is played between two teams of eleven players. Each team takes turns to bat and to bowl, and the side with more runs at the end wins the match. A batsman can score runs by running between the wickets or by hitting the ball to the boundary. The game has three main formats, which are test matches, one day internationals and the shorter twenty over game. Many people believe that the shorter format has made the sport more exciting for young audiences.`;

const SHORT = `My favourite place is the library. It is quiet and I enjoy reading there.`;

module.exports = [
  // id, what it tests, text, speech options, what a fair system should do
  ['STRONG', 'Fluent, organised, rich answer', STRONG, { wpm: 145, sentencePause: 0.45 }, 'Should score highest'],
  ['STRONG_LIKE', 'STRONG + correct uses of like/so/actually/kind of', STRONG_LIKE, { wpm: 145, sentencePause: 0.45 }, 'Should match STRONG'],
  ['ACCENT', 'STRONG, same words, ASR less sure (non-native accent)', STRONG, { wpm: 145, sentencePause: 0.45, conf: 0.78 }, 'Should match STRONG'],
  ['THINK_FIRST', 'STRONG, 4s silence before speaking', STRONG, { wpm: 145, sentencePause: 0.45, lead: 4.0, tail: 3.0 }, 'Should match STRONG'],
  ['MUMBLED', 'STRONG, but 1 word in 8 barely recognisable', STRONG, { wpm: 145, sentencePause: 0.45, unclearEvery: 8 }, 'Clarity clearly below STRONG'],
  ['GRAMMAR', 'STRONG content, frequent grammar errors', GRAMMAR, { wpm: 140, sentencePause: 0.45, conf: 0.93 }, 'Language clearly below STRONG'],
  ['AVERAGE', 'Simple answer, some um/uh, some pauses', AVERAGE, { wpm: 120, sentencePause: 0.7, fillerPause: 0.8, conf: 0.92 }, 'Clearly below STRONG'],
  ['WEAK', 'Repetitive, many fillers, long pauses', WEAK, { wpm: 85, sentencePause: 1.8, fillerPause: 1.5, conf: 0.85 }, 'Lowest score'],
  ['OFF_TOPIC', 'Fluent, but ignores the prompt', OFF_TOPIC, { wpm: 145, sentencePause: 0.45 }, 'Penalised for relevance'],
  ['SHORT', '14 words, about 7 seconds', SHORT, { wpm: 130, sentencePause: 0.45 }, 'Flagged too short to judge'],
];
module.exports.TEXT = { STRONG, STRONG_LIKE, GRAMMAR };
