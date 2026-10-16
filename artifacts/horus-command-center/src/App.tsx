import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import roomArtworkUrl from './assets/jarvis-scene-clean.png';
import {
  Activity, ArrowRight, AudioLines, Brain, Check, Clock3, Copy, FileText,
  Globe2, Home, ListTodo, Mic, Network, Send, Settings, Sparkles,
  Terminal, Wrench,
} from 'lucide-react';

type ActivityItem = { title: string; time: string; status: string };
type TaskStep = { title: string; status: 'done' | 'running' | 'pending'; time: string };

const initialSteps: TaskStep[] = [
  { title: 'Search relevant sources', status: 'done', time: '10:12' },
  { title: 'Analyze information', status: 'done', time: '10:18' },
  { title: 'Generate summary', status: 'running', time: '10:24' },
  { title: 'Create report', status: 'pending', time: '—' },
];

const initialActivity: ActivityItem[] = [
  { title: 'Web Research & Analysis', time: '10:24', status: 'Complete' },
  { title: 'System Check', time: '09:48', status: 'Complete' },
  { title: 'File Analysis', time: 'Yesterday', status: 'Complete' },
  { title: 'Code Review', time: 'Yesterday', status: 'Complete' },
];

function RoomArtwork() {
  return <div className="scene-bg" style={{ backgroundImage: `url(${roomArtworkUrl})` }} aria-hidden="true" />;
}

function Panel({ title, icon, className, children }: { title: string; icon: ReactNode; className: string; children: ReactNode }) {
  return <section className={`panel ${className}`}><header className="panel-head">{icon}<span>{title}</span></header><div className="panel-body">{children}</div></section>;
}

function CheckRow({ title, status, time, detail }: { title: string; status: 'done' | 'running' | 'pending'; time: string; detail?: string }) {
  const symbol = status === 'done' ? <Check size={10} /> : status === 'running' ? <span>•</span> : null;
  return <div className="data-row"><span className={`row-check ${status === 'pending' ? 'pending' : status === 'running' ? 'live' : ''}`}>{symbol}</span><div className="row-content">{title}{detail && <small>{detail}</small>}</div><span className={`row-state ${status === 'pending' ? 'pending' : status === 'running' ? 'live' : ''}`}>{status === 'done' ? 'Completed' : status === 'running' ? 'In Progress' : 'Pending'}</span><span className="row-time">{time}</span></div>;
}

function App() {
  const [activeNav, setActiveNav] = useState('Home');
  const [command, setCommand] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [taskTitle, setTaskTitle] = useState('Web Research & Analysis');
  const [steps, setSteps] = useState(initialSteps);
  const [activity, setActivity] = useState(initialActivity);
  const [summary, setSummary] = useState('The latest research shows a significant shift towards agentic AI systems, with major companies (OpenAI, Google, Microsoft) releasing new tools in 2025. The focus is on improving safety, alignment, and enterprise adoption. Open-source models are also gaining momentum, with increased activity on platforms like GitHub.');
  const [toast, setToast] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const progress = Math.round(steps.filter((step) => step.status === 'done').length / steps.length * 100);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 20000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const sendCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = command.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTaskTitle(text);
    setSteps([
      { title: 'Parse request', status: 'done', time },
      { title: 'Prepare local response', status: 'running', time },
      { title: 'Connect an AI backend', status: 'pending', time: '—' },
      { title: 'Deliver result', status: 'pending', time: '—' },
    ]);
    setSummary(`HORUS received: “${text}”\n\nThis is a local interface preview. No AI service is connected, so no live research or generated answer was produced.`);
    setActivity((previous) => [{ title: text, time, status: 'Received locally' }, ...previous].slice(0, 5));
    setCommand('');
    setIsListening(false);
    setToast('Command received locally — no AI service connected.');
  };

  const navItems = [
    { label: 'Home', icon: <Home /> }, { label: 'Tasks', icon: <ListTodo /> },
    { label: 'Reports', icon: <FileText /> }, { label: 'History', icon: <Clock3 /> },
    { label: 'Tools', icon: <Wrench /> }, { label: 'Settings', icon: <Settings /> },
  ];

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setToast('Summary copied to clipboard.');
    } catch {
      setToast('Clipboard access is unavailable in this browser.');
    }
  };

  const toggleMic = () => {
    const next = !isListening;
    setIsListening(next);
    setToast(next ? 'Microphone mode is on. Voice recognition is not connected.' : 'Microphone mode is off.');
  };

  return (
    <main className={`command-stage ${isListening ? 'listening' : ''}`} data-testid="horus-command-center">
      <RoomArtwork />
      <div className="scanlines" />
      <header className="topbar">
        <div className="brand">JARVIS<small>AI ASSISTANT</small></div>
        <div className="sys-indicator" data-testid="status-system"><i />SYSTEM ONLINE</div>
        <div className="stages"><span>ANALYZE</span><b>/</b><span>THINK</span><b>/</b><span>EXECUTE</span><b>/</b><span className="lit">DELIVER</span></div>
        <div className="top-right">
          <div className="clock" data-testid="text-clock">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<small>{currentTime.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</small></div>
        </div>
      </header>

      <nav className="side-nav" aria-label="Main navigation">
        {navItems.map((item) => <button type="button" key={item.label} data-testid={`nav-${item.label.toLowerCase()}`} className={activeNav === item.label ? 'selected' : ''} onClick={() => { setActiveNav(item.label); if (item.label !== 'Home') setToast(`${item.label} view selected.`); }} aria-current={activeNav === item.label ? 'page' : undefined}>{item.icon}{item.label}</button>)}
      </nav>
      <aside className="quote">The best way<br />to predict<br />the future is<br />to create it.</aside>
      <div className="core-showcase" aria-hidden="true" />

      <Panel title="Current Task" icon={<ListTodo />} className="task-panel">
        <div className="task-title"><span>{taskTitle}</span><em>{progress}%</em></div>
        <div className="meter"><span style={{ width: `${progress}%` }} /></div>
        <div className="task-detail">Searching latest AI developments in 2025...</div>
        {steps.map((step) => <CheckRow key={step.title} {...step} />)}
      </Panel>

      <Panel title="Analysis Overview" icon={<Activity />} className="analysis-panel">
        <div className="analysis-content">
          <svg className="bar-chart" viewBox="0 0 190 100" role="img" aria-label="Analysis overview bar chart">
            <g stroke="rgba(79,206,224,.17)" strokeWidth="1"><path d="M0 20H190M0 45H190M0 70H190M0 95H190" /><path d="M10 0V96M50 0V96M90 0V96M130 0V96M170 0V96" /></g>
            <g fill="#17b9d2"><rect x="17" y="57" width="12" height="38" /><rect x="43" y="39" width="12" height="56" /><rect x="69" y="48" width="12" height="47" /><rect x="95" y="22" width="12" height="73" /><rect x="121" y="34" width="12" height="61" /><rect x="147" y="64" width="12" height="31" /></g>
            <g fill="#62e4f0" opacity=".65"><rect x="17" y="53" width="12" height="4" /><rect x="43" y="35" width="12" height="4" /><rect x="69" y="44" width="12" height="4" /><rect x="95" y="18" width="12" height="4" /></g>
          </svg>
          <div className="chart-labels"><span>◦ Agentic AI</span><b>32%</b><span>◦ AI Safety</span><b>24%</b><span>◦ Open Source</span><b>18%</b><span>◦ Enterprise</span><b>14%</b><span>◦ Other</span><b>12%</b></div>
        </div>
      </Panel>

      <Panel title="Sources" icon={<Globe2 />} className="sources-panel">
        {[
          ['OpenAI Blog', 'https://openai.com', '10:14'], ['TechCrunch', 'https://techcrunch.com', '10:16'],
          ['Stanford HAI', 'https://hai.stanford.edu', '10:19'], ['GitHub', 'https://github.com', '10:21'],
        ].map(([name, url, time]) => <div className="data-row" key={name}><span className="source-icon"><Globe2 /></span><div className="row-content">{name}<small>{url}</small></div><span className="row-time">{time}</span></div>)}
        <div className="list-more">View All <ArrowRight /></div>
      </Panel>

      <Panel title="Live Results" icon={<FileText />} className="results-panel">
        {[
          ['OpenAI Blog', 'GPT-5 and agentic workflows', '10:14'],
          ['TechCrunch', 'New AI tools from major companies', '10:16'],
          ['Stanford HAI', 'AI Safety and alignment research', '10:19'],
          ['GitHub', 'Trending repositories', '10:21'],
        ].map(([name, detail, time]) => <div className="data-row" key={name}><span className="source-icon"><FileText /></span><div className="row-content">{name}<small>{detail}</small></div><span className="row-time">{time}</span></div>)}
        <div className="list-more">View All <ArrowRight /></div>
      </Panel>

      <Panel title="Key Insights" icon={<Sparkles />} className="insights-panel">
        <div className="insights-list">{['Significant growth in agentic AI systems', 'Increased focus on AI safety and alignment', 'More open-source models and tools', 'Enterprise adoption accelerating'].map((text) => <div className="insight-line" key={text}><i />{text}</div>)}</div>
        <div className="list-more">More details <ArrowRight /></div>
      </Panel>

      <Panel title="Related Topics" icon={<Network />} className="topics-panel">
        <div className="chips">{['AI', 'Machine Learning', 'LLMs', 'Cloud', 'Automation'].map((topic) => <span key={topic}>{topic}</span>)}</div>
      </Panel>

      <Panel title="Summary" icon={<FileText />} className="summary-panel">
        <div className="summary-text" data-testid="text-summary">{summary}</div>
        <button className="copy-button" type="button" onClick={copySummary} data-testid="button-copy-summary"><Copy />Copy</button>
      </Panel>

      <Panel title="Task Progress" icon={<ListTodo />} className="progress-panel">
        <div className="donut-layout">
          <div className="donut"><svg viewBox="0 0 100 100"><circle className="track" cx="50" cy="50" r="41" /><circle className="value" cx="50" cy="50" r="41" strokeDasharray={`${progress * 2.576} 258`} /></svg><strong>{progress}%</strong></div>
          <div className="progress-rows">{steps.map((step) => <CheckRow key={step.title} {...step} />)}</div>
        </div>
      </Panel>

      <Panel title="Recent Activity" icon={<Clock3 />} className="history-panel">
        {activity.slice(0, 4).map((item, index) => <div className="activity-item" key={`${item.title}-${index}`}><span className="tick">{item.status === 'Complete' ? <Check size={11} /> : '•'}</span><span className="activity-name">{item.title}</span><small>{item.time}</small><span className="activity-state">{item.status === 'Complete' ? '✓' : 'New'}</span></div>)}
      </Panel>

      <Panel title="System Status" icon={<Terminal />} className="status-panel">
        <div className="status-rows">
          <div className="status-item"><Brain /><span>AI Model</span><b>Demo</b></div>
          <div className="status-item"><Network /><span>Tools</span><b>Local</b></div>
          <div className="status-item"><Globe2 /><span>Network</span><b>Connected</b></div>
          <div className="status-item"><Activity /><span>Memory</span><b>72%</b></div>
        </div>
        <svg className="sparkline" viewBox="0 0 210 34" preserveAspectRatio="none" aria-label="System activity graph"><path d="M0 27L16 26 25 24 34 26 43 22 52 25 61 18 70 23 79 22 88 25 97 12 106 21 115 18 124 25 133 22 142 24 151 16 160 23 169 18 178 21 187 11 196 18 210 14" fill="none" stroke="#54ddeb" strokeWidth="1.6" /></svg>
      </Panel>

      {toast && <div className="toast-line" role="status" data-testid="status-message">{toast}</div>}
      <form className="command-form" onSubmit={sendCommand}>
        <AudioLines className="wave-icon" />
        <input aria-label="Command input" data-testid="input-command" placeholder="Ask me anything..." value={command} onChange={(event) => setCommand(event.target.value)} />
        <button className={`mic-button ${isListening ? 'recording' : ''}`} type="button" aria-label={isListening ? 'Turn microphone mode off' : 'Turn microphone mode on'} aria-pressed={isListening} onClick={toggleMic} data-testid="button-microphone"><Mic /></button>
        <button className="send-button" type="submit" aria-label="Send command" data-testid="button-send"><Send /></button>
      </form>
      <div className="room-grain" />
    </main>
  );
}

export default App;
