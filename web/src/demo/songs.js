// The two demo songs. Both were written for this demo: they are not real
// songs and contain no real lyrics. They are stored the same way live songs
// arrive (LRC text from LRCLIB, then one translation per unique line), so the
// demo runs through the same code path as Spotify mode.
//
// Each translation has:
//   meaning  what LyricSync shows: what the line means, in natural English
//   literal  a word-for-word rendering, for the "compare" toggle
//   note     slang, cultural context or a double meaning (or null)

export const SONGS = [
  {
    id: 'demo-azotea',
    title: 'Azotea',
    artist: 'LyricSync demo',
    credit: 'Original song written for this demo',
    lang: 'es',
    bpm: 92,
    pattern: 'dembow',
    durationMs: 78000,
    lrc: `[ti:Azotea]
[ar:LyricSync demo]
[00:05.20]Subimos a la azotea con el corillo
[00:10.40]La calle está prendía y la luna de testigo
[00:15.60]Nadie tiene chavos pero sobra la alegría
[00:20.80]Y tú bailando como si el mundo fuera tuyo
[00:26.00][00:59.80]Azotea, azotea
[00:28.60][01:02.40]Aquí arriba nadie nos frena
[00:31.20][01:05.00]Que se caiga el mundo abajo
[00:33.80][01:07.60]Esta noche es nuestra, sin pena
[00:39.00]Mi pana trajo el parlante y la nevera
[00:44.20]Janguiando hasta que el sol nos encuentre afuera
[00:49.40]Mañana toca bregar, pero eso es mañana
[00:54.60]Hoy la vida cabe entera en esta azotea
[01:12.80]¡Wepa!
[01:16.00]`,
    translations: {
      'Subimos a la azotea con el corillo': {
        meaning: 'We headed up to the rooftop with the whole crew',
        literal: 'We climbed to the flat roof with the little chorus',
        note: 'Corillo: Puerto Rican slang for your crew, the group you always roll with.',
      },
      'La calle está prendía y la luna de testigo': {
        meaning: "The street is lit and the moon's our witness",
        literal: 'The street is turned on and the moon of witness',
        note: 'Prendía is prendida with the d dropped, the way it sounds across the Caribbean. It means switched on, and at a party it means the party is going off.',
      },
      'Nadie tiene chavos pero sobra la alegría': {
        meaning: "Nobody's got money, but we've got joy to spare",
        literal: 'Nobody has nickels but the happiness is left over',
        note: 'Chavos: Puerto Rican slang for money, from the ochavo, an old Spanish coin.',
      },
      'Y tú bailando como si el mundo fuera tuyo': {
        meaning: "And you're dancing like you own the world",
        literal: 'And you dancing as if the world were yours',
        note: null,
      },
      'Azotea, azotea': {
        meaning: 'Up on the roof, up on the roof',
        literal: 'Flat roof, flat roof',
        note: "Azotea: a flat rooftop you can walk out on. In a lot of Latin American cities it's where people hang laundry, watch the sunset and throw parties.",
      },
      'Aquí arriba nadie nos frena': {
        meaning: 'Up here nobody can stop us',
        literal: 'Here above nobody brakes us',
        note: null,
      },
      'Que se caiga el mundo abajo': {
        meaning: 'Let the world fall apart down there',
        literal: 'That the world falls below',
        note: null,
      },
      'Esta noche es nuestra, sin pena': {
        meaning: 'Tonight is ours, no holding back',
        literal: 'This night is ours, without pain',
        note: "Pena usually means sorrow, but in the Caribbean and Mexico it also means embarrassment. 'Sin pena' is without shame: no holding back.",
      },
      'Mi pana trajo el parlante y la nevera': {
        meaning: 'My boy brought the speaker and the cooler',
        literal: 'My corduroy brought the speaker and the refrigerator',
        note: "Pana: buddy, close friend (Puerto Rico, Venezuela and more). Word for word it's corduroy. Nevera here is a cooler full of drinks.",
      },
      'Janguiando hasta que el sol nos encuentre afuera': {
        meaning: 'Hanging out till the sunrise finds us still out here',
        literal: 'Janguiando until the sun finds us outside',
        note: "Janguear comes from the English 'hang out'. Puerto Rican Spanish borrows English words and makes them its own.",
      },
      'Mañana toca bregar, pero eso es mañana': {
        meaning: "Tomorrow it's back to the grind, but that's tomorrow",
        literal: 'Tomorrow it touches to fight, but that is tomorrow',
        note: "Toca here means 'it's time to', not 'touches'. Bregar: to deal with things, to work hard and get by.",
      },
      'Hoy la vida cabe entera en esta azotea': {
        meaning: 'Tonight my whole life fits on this rooftop',
        literal: 'Today the life fits whole in this flat roof',
        note: 'Hoy is literally "today", but in a line like this it means right now, tonight.',
      },
      '¡Wepa!': {
        meaning: "Let's go!",
        literal: 'Wepa!',
        note: "Wepa: a shout of joy you'll hear at any Puerto Rican party. There's no direct English word for it.",
      },
    },
  },
  {
    id: 'demo-carta',
    title: 'Carta al mar',
    artist: 'LyricSync demo',
    credit: 'Original song written for this demo',
    lang: 'es',
    bpm: 72,
    pattern: 'ballad',
    durationMs: 70000,
    lrc: `[ti:Carta al mar]
[ar:LyricSync demo]
[00:04.00][00:57.00]Te escribo desde la orilla
[00:09.00]con la tinta que me dejó la noche
[00:14.00]Me quedé con las ganas de decirte
[00:19.00]que hasta tus silencios me hacían compañía
[00:25.00]Ojalá la marea te devuelva
[00:30.00]y que me encuentre despierto
[00:36.00]Ya no me duele, me cala
[00:41.00]como la lluvia fina de abril
[00:46.00]Dicen que más vale tarde que nunca
[00:51.00]pero el mar no sabe de relojes
[01:02.00]y dejo la carta abierta
[01:08.00]`,
    translations: {
      'Te escribo desde la orilla': {
        meaning: "I'm writing to you from the shore",
        literal: 'I write you from the shore',
        note: null,
      },
      'con la tinta que me dejó la noche': {
        meaning: 'with the ink the night left me',
        literal: 'with the ink that the night left me',
        note: null,
      },
      'Me quedé con las ganas de decirte': {
        meaning: 'I never got the chance to tell you',
        literal: 'I stayed with the desires of telling you',
        note: 'Quedarse con las ganas: to be left wanting, to miss your chance. Word for word it sounds like you kept the desires.',
      },
      'que hasta tus silencios me hacían compañía': {
        meaning: 'that even your silences kept me company',
        literal: 'that even your silences made me company',
        note: null,
      },
      'Ojalá la marea te devuelva': {
        meaning: 'I hope the tide brings you back',
        literal: 'God willing the tide returns you',
        note: "Ojalá comes from the Arabic for 'if God wills', a trace of the centuries Arabic was spoken in Spain. Today it just means 'I really hope'.",
      },
      'y que me encuentre despierto': {
        meaning: 'and finds me still awake, still waiting',
        literal: 'and that it finds me awake',
        note: 'Despierto means awake, and also alert or sharp. Here it carries both: still up, still waiting.',
      },
      'Ya no me duele, me cala': {
        meaning: "It doesn't hurt anymore, it just sinks in",
        literal: "Already it doesn't hurt me, it soaks me",
        note: "Calar: to soak through, like rain through a jacket, used for feelings that seep in slowly. 'Ya no' means 'not anymore', not 'already not'.",
      },
      'como la lluvia fina de abril': {
        meaning: 'like a light April rain',
        literal: 'like the fine rain of April',
        note: null,
      },
      'Dicen que más vale tarde que nunca': {
        meaning: 'They say better late than never',
        literal: 'They say that more is worth late than never',
        note: 'The same proverb exists in English, so the meaning carries over cleanly even though the words do not.',
      },
      'pero el mar no sabe de relojes': {
        meaning: "but the sea doesn't keep time",
        literal: "but the sea doesn't know of clocks",
        note: null,
      },
      'y dejo la carta abierta': {
        meaning: 'and I leave the letter open',
        literal: 'and I leave the letter open',
        note: "Carta abierta is also an 'open letter', one written for anyone to read. The double meaning is on purpose.",
      },
    },
  },
];
