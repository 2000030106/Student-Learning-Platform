import { useEffect, useMemo, useState } from 'react'
import { runPracticeCode } from '../api'

const challenges = [
  {
    id: 'profile-card',
    title: 'Profile Card',
    level: 'Web',
    runtime: 'web',
    goal: 'Build a centered student profile card with a title, short bio, and action button.',
    tests: ['Use semantic HTML', 'Style a card', 'Add one action button'],
    starter: {
      html: `<main class="card">
  <p class="eyebrow">Student</p>
  <h1>Your Name</h1>
  <p>Write a short intro about what you are learning.</p>
  <button>View progress</button>
</main>`,
      css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, sans-serif;
  background: #e0f2fe;
}

.card {
  width: min(360px, 90vw);
  padding: 32px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
}

.eyebrow {
  color: #2563eb;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

button {
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  background: #2563eb;
  color: white;
  font-weight: 800;
}`,
      js: `console.log('Profile card loaded')`,
    },
  },
  {
    id: 'score-counter',
    title: 'Score Counter',
    level: 'Web',
    runtime: 'web',
    goal: 'Create a counter that increases when the button is clicked.',
    tests: ['Select an element', 'Handle a click event', 'Update text content'],
    starter: {
      html: `<section class="counter">
  <span>Score</span>
  <strong id="score">0</strong>
  <button id="add">Add point</button>
</section>`,
      css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: Inter, system-ui, sans-serif;
  background: #f8fafc;
}

.counter {
  display: grid;
  gap: 16px;
  min-width: 280px;
  padding: 28px;
  border-radius: 16px;
  background: #0f172a;
  color: white;
}

strong {
  font-size: 56px;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 12px;
  background: #22c55e;
  color: #052e16;
  font-weight: 900;
}`,
      js: `let score = 0
const scoreEl = document.querySelector('#score')
const addButton = document.querySelector('#add')

addButton.addEventListener('click', () => {
  score += 1
  scoreEl.textContent = score
  console.log('Score:', score)
})`,
    },
  },
  {
    id: 'python-basics',
    title: 'Python Input Practice',
    level: 'Python',
    runtime: 'python',
    goal: 'Read a name from input and print a friendly learning message.',
    tests: ['Use input()', 'Store a variable', 'Print output'],
    starter: {
      main: `name = input("Enter your name: ")
print(f"Hello {name}, keep practicing Python!")`,
      stdin: 'Sai',
    },
  },
  {
    id: 'java-basics',
    title: 'Java Main Method',
    level: 'Java',
    runtime: 'java',
    goal: 'Compile and run a Java class named Main.',
    tests: ['Use class Main', 'Use public static void main', 'Print output'],
    starter: {
      main: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String name = scanner.nextLine();
        System.out.println("Hello " + name + ", keep practicing Java!");
    }
}`,
      stdin: 'Sai',
    },
  },
  {
    id: 'sql-foundation',
    title: 'SQL Select Practice',
    level: 'SQL',
    runtime: 'sql',
    goal: 'Create a small table and query enrolled students with SQL.',
    tests: ['Create a table', 'Insert sample rows', 'Run a SELECT query'],
    starter: {
      main: `CREATE TABLE enrollments (
  id INTEGER PRIMARY KEY,
  student_name TEXT NOT NULL,
  course TEXT NOT NULL,
  score INTEGER NOT NULL
);

INSERT INTO enrollments (student_name, course, score) VALUES
  ('Sai', 'Python Full Stack', 92),
  ('Anika', 'Java Full Stack', 86),
  ('Rahul', 'SQL Foundation', 78);

SELECT student_name, course, score
FROM enrollments
WHERE score >= 80
ORDER BY score DESC;`,
      stdin: '',
    },
  },
]

const languages = [
  { id: 'web', label: 'Web', file: 'index.html' },
  { id: 'python', label: 'Python', file: 'main.py' },
  { id: 'java', label: 'Java', file: 'Main.java' },
  { id: 'sql', label: 'SQL', file: 'query.sql' },
]

const storageKey = 'coding-practice-workspace-v2'

const getFirstChallenge = (language) => challenges.find((challenge) => challenge.runtime === language) || challenges[0]

const CodingPractice = ({ token, user }) => {
  const [activeLanguage, setActiveLanguage] = useState('web')
  const [activeChallengeId, setActiveChallengeId] = useState(getFirstChallenge('web').id)
  const [activeFile, setActiveFile] = useState('html')
  const [codeByChallenge, setCodeByChallenge] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      return JSON.parse(saved)
    }
    return Object.fromEntries(challenges.map((challenge) => [challenge.id, challenge.starter]))
  })
  const [previewKey, setPreviewKey] = useState(0)
  const [logs, setLogs] = useState([])
  const [runResult, setRunResult] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const languageChallenges = challenges.filter((challenge) => challenge.runtime === activeLanguage)
  const activeChallenge = challenges.find((challenge) => challenge.id === activeChallengeId) || getFirstChallenge(activeLanguage)
  const currentCode = codeByChallenge[activeChallenge.id] || activeChallenge.starter
  const isWebChallenge = activeLanguage === 'web'
  const activeLanguageMeta = languages.find((language) => language.id === activeLanguage) || languages[0]
  const activeFileName = isWebChallenge
    ? activeFile === 'html'
      ? 'index.html'
      : activeFile === 'css'
        ? 'styles.css'
        : 'script.js'
    : activeLanguageMeta.file
  const roleLabel = user?.role ? `${user.role} workspace` : 'developer workspace'

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(codeByChallenge))
  }, [codeByChallenge])

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.source !== 'practice-console') {
        return
      }
      setLogs((current) => [...current.slice(-7), event.data.message])
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const previewDocument = useMemo(
    () => `<!doctype html>
<html>
  <head>
    <style>${currentCode.css || ''}</style>
  </head>
  <body>
    ${currentCode.html || ''}
    <script>
      const sendLog = (...items) => parent.postMessage({
        source: 'practice-console',
        message: items.map((item) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(' ')
      }, '*')
      console.log = sendLog
      console.error = sendLog
      try {
        ${currentCode.js || ''}
      } catch (error) {
        sendLog(error.message)
      }
    </script>
  </body>
</html>`,
    [currentCode, previewKey],
  )

  const updateCode = (value) => {
    setCodeByChallenge((current) => ({
      ...current,
      [activeChallenge.id]: {
        ...(current[activeChallenge.id] || activeChallenge.starter),
        [isWebChallenge ? activeFile : 'main']: value,
      },
    }))
  }

  const updateStdin = (value) => {
    setCodeByChallenge((current) => ({
      ...current,
      [activeChallenge.id]: {
        ...(current[activeChallenge.id] || activeChallenge.starter),
        stdin: value,
      },
    }))
  }

  const selectLanguage = (language) => {
    const nextChallenge = getFirstChallenge(language)
    setActiveLanguage(language)
    setActiveChallengeId(nextChallenge.id)
    setActiveFile(language === 'web' ? 'html' : 'main')
    setLogs([])
    setRunResult(null)
    setPreviewKey((current) => current + 1)
  }

  const selectChallenge = (challengeId) => {
    const challenge = challenges.find((item) => item.id === challengeId) || activeChallenge
    setActiveChallengeId(challenge.id)
    setActiveLanguage(challenge.runtime)
    setActiveFile(challenge.runtime === 'web' ? 'html' : 'main')
    setLogs([])
    setRunResult(null)
    setPreviewKey((current) => current + 1)
  }

  const resetChallenge = () => {
    setCodeByChallenge((current) => ({ ...current, [activeChallenge.id]: activeChallenge.starter }))
    setLogs([])
    setRunResult(null)
    setPreviewKey((current) => current + 1)
  }

  const runCode = async () => {
    setLogs([])
    setRunResult(null)
    if (isWebChallenge) {
      setPreviewKey((current) => current + 1)
      return
    }
    setIsRunning(true)
    try {
      const result = await runPracticeCode(activeLanguage, currentCode.main || '', currentCode.stdin || '', token)
      setRunResult(result)
    } catch (err) {
      setRunResult({
        stdout: '',
        stderr: err.response?.data?.detail || 'Unable to run code.',
        exit_code: 1,
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section className="practice-page pro-ide-page">
      <header className="ide-topbar">
        <div>
          <span className="eyebrow">Coding IDE</span>
          <h1>Practice workspace</h1>
          <p>{roleLabel} / {activeFileName}</p>
        </div>
        <div className="ide-actions">
          <button className="button secondary small" type="button" onClick={resetChallenge}>
            Reset
          </button>
          <button className="button primary small" type="button" onClick={runCode} disabled={isRunning}>
            {isRunning ? 'Running...' : isWebChallenge ? 'Preview' : 'Run'}
          </button>
        </div>
      </header>

      <section className="ide-command-bar">
        <div className="language-switcher" aria-label="Select language">
          {languages.map((language) => (
            <button
              key={language.id}
              className={activeLanguage === language.id ? 'active' : ''}
              type="button"
              onClick={() => selectLanguage(language.id)}
            >
              {language.label}
            </button>
          ))}
        </div>
        <label className="challenge-select">
          <span>Challenge</span>
          <select value={activeChallenge.id} onChange={(event) => selectChallenge(event.target.value)}>
            {languageChallenges.map((challenge) => (
              <option key={challenge.id} value={challenge.id}>
                {challenge.title}
              </option>
            ))}
          </select>
        </label>
        <div className="ide-task-summary">
          <strong>{activeChallenge.goal}</strong>
          <small>{activeChallenge.tests.join(' / ')}</small>
        </div>
      </section>

      <section className="pro-ide-workbench">
        <div className="pro-editor-panel">
          <div className="editor-titlebar">
            <div className="window-dots" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <strong>{activeFileName}</strong>
            <small>{activeLanguage.toUpperCase()}</small>
          </div>

          {isWebChallenge && (
            <div className="file-tabs pro-file-tabs">
              {['html', 'css', 'js'].map((file) => (
                <button
                  key={file}
                  className={activeFile === file ? 'active' : ''}
                  type="button"
                  onClick={() => setActiveFile(file)}
                >
                  {file.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <textarea
            className="code-editor pro-code-editor"
            spellCheck="false"
            value={isWebChallenge ? currentCode[activeFile] || '' : currentCode.main || ''}
            onChange={(event) => updateCode(event.target.value)}
          />
          <div className="ide-status-bar">
            <span>{activeFileName}</span>
            <span>UTF-8</span>
            <span>{isWebChallenge ? 'Browser preview' : activeLanguage === 'sql' ? 'SQLite runtime' : 'Server runtime'}</span>
          </div>

          {!isWebChallenge && activeLanguage !== 'sql' && (
            <div className="stdin-panel pro-stdin-panel">
              <label htmlFor="stdin-input">Program input</label>
              <textarea
                id="stdin-input"
                value={currentCode.stdin || ''}
                onChange={(event) => updateStdin(event.target.value)}
                placeholder="Input lines for your program"
              />
            </div>
          )}
        </div>

        <aside className="pro-output-panel">
          <div className="output-titlebar">
            <div>
              <span className="eyebrow">{isWebChallenge ? 'Preview' : 'Output'}</span>
              <h2>{isWebChallenge ? 'Live result' : activeLanguage === 'sql' ? 'Query result' : 'Run result'}</h2>
            </div>
            <span className={runResult?.exit_code === 0 || isWebChallenge ? 'run-state ok' : 'run-state'}>
              {isWebChallenge ? 'ready' : runResult ? `exit ${runResult.exit_code}` : 'idle'}
            </span>
          </div>

          {isWebChallenge ? (
            <>
              <iframe key={previewKey} title="Coding practice preview" sandbox="allow-scripts" srcDoc={previewDocument} />
              <div className="practice-console">
                <strong>Console</strong>
                {logs.length === 0 ? <small>No logs yet</small> : logs.map((log, index) => <small key={`${log}-${index}`}>{log}</small>)}
              </div>
            </>
          ) : (
            <div className="runtime-output">
              <div>
                <strong>{activeLanguage === 'sql' ? 'Result table' : 'Standard output'}</strong>
                <pre>{runResult?.stdout || 'Run your code to see output here.'}</pre>
              </div>
              <div>
                <strong>Errors</strong>
                <pre>{runResult?.stderr || 'No errors.'}</pre>
              </div>
              {runResult && <small>Exit code: {runResult.exit_code}{runResult.timed_out ? ' - timed out' : ''}</small>}
            </div>
          )}
        </aside>
      </section>
    </section>
  )
}

export default CodingPractice
