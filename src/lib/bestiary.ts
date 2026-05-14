export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';

export type Creature = {
  id: number;
  name: string;
  rarity: Rarity;
  type: string;
  power: string;
  powerDesc: string;
  image: string;
  floating: string;
  lore: string;
};

export const BESTIARY: Creature[] = [
  { id: 1, name: 'SPRITE', rarity: 'common', type: 'Wisp', power: 'Static', powerDesc: 'Spawns next creature 10% closer.', image: '/cards/001_sprite.jpg', floating: '/floating-all/001_sprite.png', lore: 'The first one came at dusk.' },
  { id: 2, name: 'NIBBLER', rarity: 'common', type: 'Beast', power: 'Bite', powerDesc: 'Reveals nearby spawns for 5 min.', image: '/cards/002_nibbler.png', floating: '/floating-all/002_nibbler.png', lore: 'Small. Sharp. Always hungry.' },
  { id: 3, name: 'PIXIE', rarity: 'common', type: 'Fae', power: 'Glint', powerDesc: 'Next 3 catches give +25%.', image: '/cards/003_pixie.jpg', floating: '/floating-all/003_pixie.png', lore: 'A tiny luminous figure with crackling wings.' },
  { id: 4, name: 'EMBERLING', rarity: 'common', type: 'Flame', power: 'Heat', powerDesc: '+50% during peak hours.', image: '/cards/004_emberling.png', floating: '/floating-all/004_emberling.png', lore: 'A spark wearing the shape of a creature.' },
  { id: 5, name: 'DUSTFOX', rarity: 'common', type: 'Beast', power: 'Trace', powerDesc: 'Summons free spawns nearby.', image: '/cards/005_dustfox.jpg', floating: '/floating-all/005_dustfox.png', lore: 'Appears where the chain has gone quiet.' },
  { id: 6, name: 'PEBBLEKIN', rarity: 'common', type: 'Stone', power: 'Stack', powerDesc: 'Owning 5+ grants +5% boost.', image: '/cards/006_pebblekin.png', floating: '/floating-all/006_pebblekin.png', lore: 'They gather in piles. The more you have, the more they whisper.' },
  { id: 7, name: 'SPECKLE', rarity: 'common', type: 'Echo', power: 'Trace', powerDesc: 'Counts double toward streaks.', image: '/cards/007_speckle.jpg', floating: '/floating-all/007_speckle.png', lore: 'The smallest sighting. Often unwitnessed.' },
  { id: 8, name: 'HOPSPIRIT', rarity: 'common', type: 'Fae', power: 'Twitch', powerDesc: 'Speed catch gives bonus.', image: '/cards/008_hopspirit.jpg', floating: '/floating-all/008_hopspirit.png', lore: 'A rabbit-shaped echo.' },
  { id: 9, name: 'SHIMMER', rarity: 'common', type: 'Mirror', power: 'Reflect', powerDesc: 'Shows local watcher activity.', image: '/cards/009_shimmer.png', floating: '/floating-all/009_shimmer.png', lore: 'Mirror-skinned. Reflects what you cannot see.' },
  { id: 10, name: 'SILKMOTH', rarity: 'common', type: 'Wing', power: 'Night', powerDesc: '2x at night (22-04 UTC).', image: '/cards/010_silkmoth.jpg', floating: '/floating-all/010_silkmoth.png', lore: 'Drawn to phone screens after dark.' },
  { id: 11, name: 'CAT', rarity: 'uncommon', type: 'Sentinel', power: 'Memory', powerDesc: 'Unlocks BLINK lore on catch.', image: '/cards/011_cat.jpg', floating: '/floating-all/011_cat.png', lore: 'Older than the chain itself.' },
  { id: 12, name: 'GLITCH HARE', rarity: 'uncommon', type: 'Bug', power: 'Fork', powerDesc: '50/50 gamble: bonus or penalty.', image: '/cards/012_glitchhare.png', floating: '/floating-all/012_glitchhare.png', lore: 'A hare that exists on two blocks at once.' },
  { id: 13, name: 'WHISKERWISP', rarity: 'uncommon', type: 'Spirit', power: 'Sense', powerDesc: 'Reveals rare spawns nearby.', image: '/cards/013_whiskerwisp.jpg', floating: '/floating-all/013_whiskerwisp.png', lore: 'Six-tailed fox spirit.' },
  { id: 14, name: 'HUSHLING', rarity: 'uncommon', type: 'Shadow', power: 'Silent', powerDesc: 'Inactivity grants bonus.', image: '/cards/014_hushling.jpg', floating: '/floating-all/014_hushling.png', lore: 'Voiceless. When near, your phone goes still.' },
  { id: 15, name: 'EYEFLY', rarity: 'uncommon', type: 'Swarm', power: 'Pair', powerDesc: '30% chance second spawns.', image: '/cards/015_eyefly.png', floating: '/floating-all/015_eyefly.png', lore: 'A single eye with insect wings. Travels in pairs.' },
  { id: 16, name: 'CYCLOPS', rarity: 'rare', type: 'Sentinel', power: 'Focus', powerDesc: 'Permanent badge + bonus.', image: '/cards/016_cyclops.jpg', floating: '/floating-all/016_cyclops.png', lore: 'Sees only one thing. But sees it completely.' },
  { id: 17, name: 'AETHERMANE', rarity: 'rare', type: 'Mythic', power: 'Roar', powerDesc: 'Council access for 7 days.', image: '/cards/017_aethermane.jpg', floating: '/floating-all/017_aethermane.png', lore: 'A lion-spirit with a mane of green lightning.' },
  { id: 18, name: 'ORACLE', rarity: 'legendary', type: 'Witness', power: 'Omen', powerDesc: 'Permanent badge + Council.', image: '/cards/018_oracle.jpg', floating: '/floating-all/018_oracle.png', lore: 'When you see it, the trade has already happened.' },
  { id: 19, name: 'THE PHOENIX', rarity: 'legendary', type: 'Mythic', power: 'Rebirth', powerDesc: 'Phoenix Bearer status.', image: '/cards/019_phoenix.png', floating: '/floating-all/019_phoenix.png', lore: 'Born from green candles.' },
  { id: 20, name: 'THE FIRST EYE', rarity: 'mythic', type: 'Ancestral', power: 'Witness', powerDesc: 'Council Founder · Eternal status.', image: '/cards/020_firsteye.jpg', floating: '/floating-all/020_firsteye.png', lore: 'The original. All others are echoes of it.' },
];

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9aa3b2',
  uncommon: '#00FF88',
  rare: '#88FF00',
  legendary: '#ffd166',
  mythic: '#ff8ae0',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
  mythic: 'Mythic',
};

export const BLINK_GENESIS_CONTRACT = '0x85e7CB56fA10f26fEAe20449e71AD1503867799A';
export const BLINK_MINT_URL = 'https://mintmyblink.com';
export const BLINK_OPENSEA_URL = `https://opensea.io/assets/ethereum/${BLINK_GENESIS_CONTRACT}`;
