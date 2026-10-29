import { AGE_RATINGS, Content, ContentStatus, ContentType, Language } from '../models/content.model';

// Fictional catalogue used by the demo backend. Any resemblance to real titles is coincidental.
const CATALOGUE: [string, ContentType, string, Language][] = [
  ['The Monsoon Ledger', 'Movie', 'Drama', 'Hindi'],
  ['Neon Harbour', 'Series', 'Thriller', 'English'],
  ['Kaveri Nights', 'Movie', 'Romance', 'Kannada'],
  ['Signal 24x7', 'Live Channel', 'News', 'English'],
  ['Little Rocket Club', 'Series', 'Kids', 'English'],
  ['Deccan Express', 'Movie', 'Action', 'Telugu'],
  ['Echoes of Hampi', 'Movie', 'Documentary', 'English'],
  ['The Last Over', 'Movie', 'Sports', 'Hindi'],
  ['Backwater Tales', 'Series', 'Drama', 'Malayalam'],
  ['Chennai Code', 'Series', 'Thriller', 'Tamil'],
  ['Bhakti Live', 'Live Channel', 'Devotional', 'Telugu'],
  ['Laugh Lane', 'Series', 'Comedy', 'Hindi'],
  ['Silent Rivers', 'Movie', 'Drama', 'Bengali'],
  ['Kolkata Calling', 'Series', 'Romance', 'Bengali'],
  ['Arena Sports HD', 'Live Channel', 'Sports', 'English'],
  ['Midnight Masala', 'Movie', 'Comedy', 'Tamil'],
  ['Pune Diaries', 'Series', 'Drama', 'Marathi'],
  ['Neon Harbour: Pilot', 'Episode', 'Thriller', 'English'],
  ['Neon Harbour: The Tide', 'Episode', 'Thriller', 'English'],
  ['Wild Ghats', 'Movie', 'Documentary', 'Kannada'],
  ['The Accountant of Agra', 'Movie', 'Comedy', 'Hindi'],
  ['Shadow Protocol', 'Movie', 'Action', 'Hindi'],
  ['Telugu Times Live', 'Live Channel', 'News', 'Telugu'],
  ['Laugh Lane: Office Party', 'Episode', 'Comedy', 'Hindi'],
  ['Spice Route', 'Series', 'Documentary', 'Malayalam'],
  ['First Rain', 'Movie', 'Romance', 'Telugu'],
  ['Cartoon Carnival', 'Live Channel', 'Kids', 'Hindi'],
  ['The Ninth Floor', 'Movie', 'Thriller', 'Tamil'],
  ['Chennai Code: Zero Day', 'Episode', 'Thriller', 'Tamil'],
  ['Marathi Manch', 'Series', 'Drama', 'Marathi'],
  ['Coastal Kitchen', 'Series', 'Documentary', 'Malayalam'],
  ['Run Raja Run Again', 'Movie', 'Action', 'Telugu'],
  ['Prayer Hour', 'Live Channel', 'Devotional', 'Tamil'],
  ['Hostel Days', 'Series', 'Comedy', 'Kannada'],
  ['The Long Drive', 'Movie', 'Drama', 'English'],
  ['Backwater Tales: Homecoming', 'Episode', 'Drama', 'Malayalam'],
  ['Kabaddi Kings', 'Movie', 'Sports', 'Kannada'],
  ['Moonlit Mumbai', 'Movie', 'Romance', 'Hindi'],
];

const STATUS_CYCLE: ContentStatus[] = ['Published', 'Published', 'Draft', 'Published', 'Archived', 'Published', 'Draft'];
const SECOND_LANGUAGE: Record<Language, Language> = {
  English: 'Hindi', Hindi: 'English', Telugu: 'Hindi', Tamil: 'Telugu',
  Malayalam: 'Tamil', Kannada: 'Telugu', Bengali: 'Hindi', Marathi: 'Hindi',
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function buildSeed(): Content[] {
  return CATALOGUE.map(([title, type, genre, primaryLanguage], i) => {
    const second = SECOND_LANGUAGE[primaryLanguage];
    return {
      id: i + 1,
      title,
      type,
      genre,
      primaryLanguage,
      translations: i % 3 === 0 ? [{ language: second, title: `${title} (${second})` }] : [],
      status: STATUS_CYCLE[i % STATUS_CYCLE.length],
      ageRating: AGE_RATINGS[i % AGE_RATINGS.length],
      releaseDate: isoDaysAgo(60 + i * 37).slice(0, 10),
      durationMinutes: type === 'Live Channel' ? null : type === 'Episode' ? 42 + (i % 4) * 3 : 95 + (i % 6) * 9,
      thumbnailUrl: '',
      description: `${title} is a ${genre.toLowerCase()} ${type.toLowerCase()} in ${primaryLanguage}.`,
      tags: [genre.toLowerCase(), primaryLanguage.toLowerCase()],
      updatedAt: isoDaysAgo(i * 2 + (i % 5)),
    };
  });
}
