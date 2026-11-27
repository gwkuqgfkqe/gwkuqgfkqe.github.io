import { profile } from './content';

export default function ProfileIntro() {
  return <section id="about" className="profile-intro" aria-labelledby="profile-name">
    <div className="profile-text">
      <h1 id="profile-name">Zonghan Du</h1>
      <p>I’m a master’s student in Biomedical Engineering at Brown University. I work with John Simeral at <a href="https://www.braingate.org/team/zonghan-du/">BrainGate</a> and with Todd Herrington at Massachusetts General Hospital.</p>
      <p>I study how brain–computer interfaces can recognize intended movements over time. At BrainGate, I develop decoders for hand gestures recorded across sessions. At MGH, I study how intracranial activity relates to approach–avoidance decisions.</p>
      <p>I received my B.Eng. in Computer Science and Technology from Sun Yat-sen University.</p>
      <nav className="profile-links" aria-label="Profile links">
        <a href={'mailto:' + profile.email}>Email</a><a href="/cv/">CV</a>
        <a href={profile.scholar}>Google Scholar</a><a href={profile.github}>GitHub</a>
      </nav>
    </div>
    <a className="portrait" href="https://www.braingate.org/team/zonghan-du/" aria-label="Zonghan Du’s BrainGate profile">
      <img src="/zonghan-du.webp" alt="Zonghan Du" width="560" height="560" fetchPriority="high"/>
    </a>
  </section>;
}
