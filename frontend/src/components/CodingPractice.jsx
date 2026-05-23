import { useEffect, useMemo, useState } from 'react'
import { runPracticeCode } from '../api'

const challenges = [
  {
    id: 'profile-card',
    title: 'Profile Card',
    level: 'Beginner',
    runtime: 'web',
    goal: 'Build a centered student profile card with a title, short bio, and action button.',
    tests: ['Use a heading', 'Style a card', 'Add one button'],
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
    level: 'JavaScript',
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
    id: 'course-list',
    title: 'Course List',
    level: 'Layout',
    runtime: 'web',
    goal: 'Render course cards from an array using JavaScript.',
    tests: ['Use an array', 'Loop over items', 'Render cards into the page'],
    starter: {
      html: `<main>
  <h1>My Courses</h1>
  <div id="courses" class="grid"></div>
</main>`,
      css: `body {
  margin: 0;
  font-family: Inter, system-ui, sans-serif;
  background: #ecfeff;
  color: #0f172a;
}

main {
  width: min(900px, 92vw);
  margin: 48px auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.course {
  border-radius: 16px;
  padding: 20px;
  background: white;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}`,
      js: `const courses = ['Java Full Stack', 'Python Full Stack', 'SQL Foundation']
const container = document.querySelector('#courses')

container.innerHTML = courses
  .map((course) => \`<article class="course"><h2>\${course}</h2><p>Practice daily.</p></article>\`)
  .join('')`,
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
]

const storageKey = 'coding-practice-workspace'

const CodingPractice = ({ token }) => {
  const [activeChallengeId, setActiveChallengeId] = useState(challenges[0].id)
  const [activeFile, setActiveFile] = useState('html')
  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? JSON.parse(saved) : challenges[0].starter
  })
  const [previewKey, setPreviewKey] = useState(0)
  const [logs, setLogs] = useState([])
  const [runResult, setRunResult] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const activeChallenge = challenges.find((challenge) => challenge.id === activeChallengeId) || challenges[0]
  const isWebChallenge = activeChallenge.runtime === 'web'

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(code))
  }, [code])

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
    <style>${code.css}</style>
  </head>
  <body>
    ${code.html}
    <script>
      const sendLog = (...items) => parent.postMessage({
        source: 'practice-console',
        message: items.map((item) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(' ')
      }, '*')
      console.log = sendLog
      console.error = sendLog
      try {
        ${code.js}
      } catch (error) {
        sendLog(error.message)
      }
    </script>
  </body>
</html>`,
    [code, previewKey],
  )

  const updateCode = (value) => {
    setCode((current) => ({ ...current, [isWebChallenge ? activeFile : 'main']: value }))
  }

  const updateStdin = (value) => {
    setCode((current) => ({ ...current, stdin: value }))
  }

  const loadChallenge = (challenge) => {
    setActiveChallengeId(challenge.id)
    setCode(challenge.starter)
    setActiveFile(challenge.runtime === 'web' ? 'html' : 'main')
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
      const result = await runPracticeCode(activeChallenge.runtime, code.main || '', code.stdin || '', token)
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
    <section className="practice-page">
      <header className="practice-hero">
        <div>
          <span className="eyebrow">Coding Practice</span>
          <h1>Build, run, and learn in the browser.</h1>
          <p>Practice web, Python, and Java tasks with live output and starter challenges.</p>
        </div>
        <div className="practice-score-card">
          <span>Current task</span>
          <strong>{activeChallenge.level}</strong>
          <small>{activeChallenge.title}</small>
        </div>
      </header>

      <div className="practice-layout">
        <aside className="challenge-panel">
          <div className="practice-panel-heading">
            <span className="eyebrow">Challenges</span>
            <h2>Pick a task</h2>
          </div>
          <div className="challenge-list">
            {challenges.map((challenge) => (
              <button
                key={challenge.id}
                className={challenge.id === activeChallengeId ? 'active' : ''}
                type="button"
                onClick={() => loadChallenge(challenge)}
              >
                <span>{challenge.level}</span>
                <strong>{challenge.title}</strong>
                <small>{challenge.goal}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="editor-panel">
          <div className="practice-panel-heading">
            <div>
              <span className="eyebrow">Editor</span>
              <h2>{activeChallenge.title}</h2>
            </div>
            <div className="editor-actions">
              <button className="button secondary small" type="button" onClick={() => loadChallenge(activeChallenge)}>
                Reset
              </button>
              <button className="button primary small" type="button" onClick={runCode} disabled={isRunning}>
                {isRunning ? 'Running...' : 'Run'}
              </button>
            </div>
          </div>

          {isWebChallenge ? (
            <div className="file-tabs">
              {['html', 'css', 'js'].map((file) => (
                <button key={file} className={activeFile === file ? 'active' : ''} type="button" onClick={() => setActiveFile(file)}>
                  {file.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <div className="file-tabs">
              <button className="active" type="button">
                {activeChallenge.runtime === 'python' ? 'PYTHON' : 'JAVA'}
              </button>
            </div>
          )}

          <textarea
            className="code-editor"
            spellCheck="false"
            value={isWebChallenge ? code[activeFile] || '' : code.main || ''}
            onChange={(event) => updateCode(event.target.value)}
          />
          {!isWebChallenge && (
            <div className="stdin-panel">
              <label htmlFor="stdin-input">Program input</label>
              <textarea
                id="stdin-input"
                value={code.stdin || ''}
                onChange={(event) => updateStdin(event.target.value)}
                placeholder="Input lines for your program"
              />
            </div>
          )}
        </section>

        <section className="preview-panel">
          <div className="practice-panel-heading">
            <div>
              <span className="eyebrow">{isWebChallenge ? 'Preview' : 'Output'}</span>
              <h2>{isWebChallenge ? 'Live output' : 'Run result'}</h2>
            </div>
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
                <strong>Standard output</strong>
                <pre>{runResult?.stdout || 'Run your code to see output here.'}</pre>
              </div>
              <div>
                <strong>Errors</strong>
                <pre>{runResult?.stderr || 'No errors.'}</pre>
              </div>
              {runResult && <small>Exit code: {runResult.exit_code}{runResult.timed_out ? ' - timed out' : ''}</small>}
            </div>
          )}
        </section>
      </div>

      <section className="practice-checklist">
        {activeChallenge.tests.map((item) => (
          <article key={item}>
            <span></span>
            <strong>{item}</strong>
          </article>
        ))}
      </section>
    </section>
  )
}

export default CodingPractice
