import records from './academic.json';

export const profile = {
  name: 'Zonghan Du',
  email: 'zonghan_du@brown.edu',
  github: 'https://github.com/gwkuqgfkqe',
  scholar: 'https://scholar.google.com/citations?user=ibxu-yQAAAAJ&hl=en',
  linkedin: 'https://www.linkedin.com/in/zonghan-frank-du',
  updated: 'November 26, 2026',
};

export const { projects, publications, experience } = records;
export const legacyProjects: Record<string, string> = {
  driftfuse: 'gesture-decoding',
  neuroscribe: 'ss-dmp',
};

export function projectBySlug(slug: string) {
  return projects.find(project => project.id === (legacyProjects[slug] || slug));
}
