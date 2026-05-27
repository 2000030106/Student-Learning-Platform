import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  createCodingContest,
  createLearningItem,
  createQuiz,
  deleteCodingContest,
  fetchCodingContestAnalytics,
  fetchCodingContests,
  deleteLearningItem,
  fetchCourse,
  fetchCourseAccess,
  fetchCourseLearning,
  fetchQuiz,
  fetchQuizAnalytics,
  fetchQuizReview,
  fetchQuizzes,
  requestAccess,
  requestToTeachCourse,
  submitCodingContest,
  submitQuizAttempt,
  updateLearningItem,
} from '../api'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'content', label: 'Content' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'coding', label: 'Coding' },
  { id: 'videos', label: 'Videos' },
]

const emptyLearningForm = {
  kind: 'module',
  title: '',
  body: '',
  resource_url: '',
  position: 1,
}

const CourseDetail = ({ token, user }) => {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [course, setCourse] = useState(null)
  const [learning, setLearning] = useState(null)
  const [accessStatus, setAccessStatus] = useState('')
  const [trainerTeachStatus, setTrainerTeachStatus] = useState('')
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'quiz' ? 'quiz' : 'overview')
  const [selectedModuleId, setSelectedModuleId] = useState(null)
  const [form, setForm] = useState(emptyLearningForm)
  const [editingItem, setEditingItem] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showQuizBuilder, setShowQuizBuilder] = useState(false)
  const [showQuizResults, setShowQuizResults] = useState(false)
  const [showCodingBuilder, setShowCodingBuilder] = useState(false)
  const [showCodingResults, setShowCodingResults] = useState(false)
  const [quizzes, setQuizzes] = useState([])
  const [quizDetail, setQuizDetail] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizReview, setQuizReview] = useState(null)
  const [quizAnalytics, setQuizAnalytics] = useState(null)
  const [codingContests, setCodingContests] = useState([])
  const [codingAnalytics, setCodingAnalytics] = useState(null)
  const [codingAnswer, setCodingAnswer] = useState('')
  const [codingResult, setCodingResult] = useState(null)
  const [selectedContestId, setSelectedContestId] = useState(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [codingDraft, setCodingDraft] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
    question_title: '',
    prompt: '',
    language: 'python',
    starter_code: 'print("Hello coding contest")',
    stdin: '',
    expected_output: '',
    check: '',
    marks: 10,
  })
  const [draftCodingQuestions, setDraftCodingQuestions] = useState([])
  const [quizDraft, setQuizDraft] = useState({
    title: '',
    description: '',
    time_limit_minutes: 10,
    passing_score: 60,
    starts_at: '',
    ends_at: '',
    prompt: '',
    type: 'single',
    options: '',
    correct: '',
    explanation: '',
  })
  const [draftQuestions, setDraftQuestions] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const canManageLearning = user?.role === 'admin' || (user?.role === 'trainer' && trainerTeachStatus === 'approved')
  const hasApprovedAccess = accessStatus === 'approved' || canManageLearning

  const loadLearning = async () => {
    const data = await fetchCourseLearning(slug, token)
    setLearning(data)
    setCourse(data.course)
    setAccessStatus(data.access_status || 'approved')
    setSelectedModuleId((current) => current || data.modules[0]?.id || null)
    fetchQuizzes(slug, token).then(setQuizzes).catch(() => {})
    fetchCodingContests(slug, token).then((items) => {
      setCodingContests(items)
      setSelectedContestId((current) => current || items[0]?.id || null)
    }).catch(() => {})
  }

  useEffect(() => {
    if (!quizDetail || !timeLeft || quizReview) {
      return undefined
    }
    const timer = window.setInterval(() => {
      setTimeLeft((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [quizDetail, timeLeft, quizReview])

  useEffect(() => {
    if (quizDetail && timeLeft === 0 && !quizReview) {
      handleSubmitQuiz()
    }
  }, [timeLeft])

  useEffect(() => {
    setCourse(null)
    setLearning(null)
    setAccessStatus('')
    setTrainerTeachStatus('')
    setSelectedModuleId(null)
    setMessage('')
    setError('')

    fetchCourse(slug)
      .then(setCourse)
      .catch(() => setError('Unable to load course information.'))

    if (!token) {
      return
    }

    fetchCourseAccess(slug, token)
      .then((data) => {
        setAccessStatus(data.status || '')
        setTrainerTeachStatus(data.trainer_status || '')
        if (data.status === 'approved') {
          return loadLearning()
        }
        return null
      })
      .catch(() => setAccessStatus(''))
  }, [slug, token])

  useEffect(() => {
    if (searchParams.get('tab') === 'quiz') {
      setActiveTab('quiz')
    }
  }, [searchParams])

  const selectedModule = useMemo(() => {
    if (!learning?.modules?.length) {
      return null
    }
    return learning.modules.find((item) => item.id === selectedModuleId) || learning.modules[0]
  }, [learning, selectedModuleId])

  const visibleItems =
    activeTab === 'content'
      ? learning?.modules || []
      : activeTab === 'quiz'
        ? learning?.quizzes || []
        : activeTab === 'videos'
          ? learning?.videos || []
          : []

  const managedItems =
    activeTab === 'content'
      ? learning?.modules || []
      : activeTab === 'videos'
        ? learning?.videos || []
        : activeTab === 'overview'
          ? [learning?.overview].filter(Boolean)
          : []

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  }

  const formatQuizDateTime = (value) => {
    if (!value) {
      return 'Not scheduled'
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  const handleRequestAccess = async () => {
    setError('')
    setMessage('')
    if (!token) {
      setError('Login as a student to request access.')
      return
    }
    try {
      await requestAccess(slug, token)
      setAccessStatus('pending')
      setMessage('Access request sent. Wait for admin approval.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to request access.')
    }
  }

  const handleRequestToTeach = async () => {
    setError('')
    setMessage('')
    try {
      await requestToTeachCourse(slug, token)
      setTrainerTeachStatus('pending')
      setAccessStatus('pending')
      setMessage('Teaching request sent. Admin approval is required before editing this course.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to request this course.')
    }
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'position' ? Number(value) : value,
    }))
  }

  const beginEdit = (item) => {
    setEditingItem(item)
    setShowEditor(true)
    setForm({
      kind: item.kind,
      title: item.title,
      body: item.body,
      resource_url: item.resource_url || '',
      position: item.position,
    })
  }

  const resetForm = () => {
    setEditingItem(null)
    setShowEditor(false)
    setForm(emptyLearningForm)
  }

  const prepareNewItem = (kind) => {
    setEditingItem(null)
    setShowEditor(true)
    setForm({
      ...emptyLearningForm,
      kind,
      position:
        kind === 'module'
          ? (learning?.modules?.length || 0) + 1
          : kind === 'quiz'
            ? (learning?.quizzes?.length || 0) + 1
            : kind === 'video'
              ? (learning?.videos?.length || 0) + 1
              : 1,
    })
  }

  const saveLearningItem = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const payload = { ...form, resource_url: form.resource_url || null }
      if (editingItem) {
        await updateLearningItem(slug, editingItem.id, payload, token)
      } else {
        await createLearningItem(slug, payload, token)
      }
      await loadLearning()
      setMessage(editingItem ? 'Learning item updated.' : 'Learning item added.')
      resetForm()
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to save learning item.')
    }
  }

  const handleQuizDraftChange = (event) => {
    const { name, value } = event.target
    setQuizDraft((prev) => ({
      ...prev,
      [name]: name === 'time_limit_minutes' || name === 'passing_score' ? Number(value) : value,
    }))
  }

  const addDraftQuestion = () => {
    const optionLines = quizDraft.options.split('\n').map((line) => line.trim()).filter(Boolean)
    const options = optionLines.map((text, index) => ({ id: String.fromCharCode(65 + index), text }))
    const correct_option_ids = quizDraft.correct
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
    if (!quizDraft.prompt || options.length < 2 || correct_option_ids.length === 0) {
      setError('Add a question, at least two options, and correct answer letters.')
      return
    }
    setDraftQuestions((prev) => [
      ...prev,
      {
        id: `q${Date.now()}`,
        prompt: quizDraft.prompt,
        type: quizDraft.type,
        options,
        correct_option_ids,
        explanation: quizDraft.explanation,
      },
    ])
    setQuizDraft((prev) => ({ ...prev, prompt: '', options: '', correct: '', explanation: '' }))
    setError('')
  }

  const saveQuiz = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (draftQuestions.length === 0) {
      setError('Add at least one quiz question.')
      return
    }
    try {
      await createQuiz(
        slug,
        {
          title: quizDraft.title,
          description: quizDraft.description,
          time_limit_minutes: quizDraft.time_limit_minutes,
          passing_score: quizDraft.passing_score,
          starts_at: quizDraft.starts_at ? new Date(quizDraft.starts_at).toISOString() : null,
          ends_at: quizDraft.ends_at ? new Date(quizDraft.ends_at).toISOString() : null,
          questions: draftQuestions,
        },
        token,
      )
      setQuizzes(await fetchQuizzes(slug, token))
      setDraftQuestions([])
      setQuizDraft({
        title: '',
        description: '',
        time_limit_minutes: 10,
        passing_score: 60,
        starts_at: '',
        ends_at: '',
        prompt: '',
        type: 'single',
        options: '',
        correct: '',
        explanation: '',
      })
      setMessage('Quiz created successfully.')
      setShowQuizBuilder(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to create quiz.')
    }
  }

  const startQuiz = async (quiz) => {
    setQuizReview(null)
    setQuizAnswers({})
    setCurrentQuestionIndex(0)
    setQuizAnalytics(null)
    const detail = await fetchQuiz(slug, quiz.id, token)
    setQuizDetail(detail)
    setTimeLeft(detail.time_limit_minutes * 60)
  }

  const toggleAnswer = (question, optionId) => {
    setQuizAnswers((prev) => {
      const existing = prev[question.id] || []
      if (question.type === 'multiple') {
        return {
          ...prev,
          [question.id]: existing.includes(optionId)
            ? existing.filter((item) => item !== optionId)
            : [...existing, optionId],
        }
      }
      return { ...prev, [question.id]: [optionId] }
    })
  }

  const handleSubmitQuiz = async () => {
    if (!quizDetail) {
      return
    }
    try {
      await submitQuizAttempt(
        slug,
        quizDetail.id,
        quizDetail.questions.map((question) => ({
          question_id: question.id,
          selected_option_ids: quizAnswers[question.id] || [],
        })),
        token,
      )
      const review = await fetchQuizReview(slug, quizDetail.id, token)
      setQuizReview(review)
      setQuizzes(await fetchQuizzes(slug, token))
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to submit quiz.')
    }
  }

  const loadAnalytics = async (quiz) => {
    setQuizDetail(null)
    setQuizReview(null)
    const data = await fetchQuizAnalytics(slug, quiz.id, token)
    setQuizAnalytics(data)
    setShowQuizResults(true)
  }

  const returnToQuizList = () => {
    setQuizDetail(null)
    setQuizReview(null)
    setQuizAnswers({})
    setCurrentQuestionIndex(0)
    setTimeLeft(0)
    setError('')
  }

  const handleCodingDraftChange = (event) => {
    const { name, value } = event.target
    setCodingDraft((prev) => ({
      ...prev,
      [name]: name === 'marks' ? Number(value) : value,
    }))
  }

  const addCodingQuestion = () => {
    if (!codingDraft.question_title || !codingDraft.prompt || !codingDraft.starter_code) {
      setError('Add a question title, prompt, and starter code.')
      return
    }
    const testCase =
      codingDraft.language === 'web'
        ? { check: codingDraft.check || '<', expected_output: codingDraft.check || '<', hidden: false }
        : { input: codingDraft.stdin || '', expected_output: codingDraft.expected_output || '', hidden: false }
    setDraftCodingQuestions((prev) => [
      ...prev,
      {
        title: codingDraft.question_title,
        prompt: codingDraft.prompt,
        language: codingDraft.language,
        starter_code: codingDraft.starter_code,
        stdin: codingDraft.stdin,
        test_cases: [testCase],
        marks: codingDraft.marks,
        position: prev.length + 1,
      },
    ])
    setCodingDraft((prev) => ({
      ...prev,
      question_title: '',
      prompt: '',
      stdin: '',
      expected_output: '',
      check: '',
    }))
    setError('')
  }

  const saveCodingContest = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (draftCodingQuestions.length === 0) {
      setError('Add at least one coding question.')
      return
    }
    try {
      await createCodingContest(
        slug,
        {
          title: codingDraft.title,
          description: codingDraft.description,
          starts_at: codingDraft.starts_at ? new Date(codingDraft.starts_at).toISOString() : null,
          ends_at: codingDraft.ends_at ? new Date(codingDraft.ends_at).toISOString() : null,
          questions: draftCodingQuestions,
        },
        token,
      )
      const contests = await fetchCodingContests(slug, token)
      setCodingContests(contests)
      setSelectedContestId(contests[0]?.id || null)
      setDraftCodingQuestions([])
      setCodingDraft({
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        question_title: '',
        prompt: '',
        language: 'python',
        starter_code: 'print("Hello coding contest")',
        stdin: '',
        expected_output: '',
        check: '',
        marks: 10,
      })
      setMessage('Coding contest created.')
      setShowCodingBuilder(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to create coding contest.')
    }
  }

  const removeCodingContest = async (contest) => {
    const confirmed = window.confirm(`Delete ${contest.title}?`)
    if (!confirmed) {
      return
    }
    try {
      await deleteCodingContest(slug, contest.id, token)
      setCodingContests((prev) => prev.filter((item) => item.id !== contest.id))
      setMessage('Coding contest deleted.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to delete coding contest.')
    }
  }

  const startCodingQuestion = (contest, question) => {
    setSelectedContestId(contest.id)
    setSelectedQuestionId(question.id)
    setCodingAnswer(question.starter_code)
    setCodingResult(null)
    setCodingAnalytics(null)
  }

  const submitCodingAnswer = async () => {
    if (!selectedContestId || !selectedQuestionId) {
      return
    }
    try {
      const result = await submitCodingContest(slug, selectedContestId, selectedQuestionId, codingAnswer, token)
      setCodingResult(result)
      setMessage(`Submission scored ${result.score}.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to submit coding answer.')
    }
  }

  const loadCodingAnalytics = async (contest) => {
    setSelectedContestId(contest.id)
    setSelectedQuestionId(null)
    setCodingResult(null)
    try {
      setCodingAnalytics(await fetchCodingContestAnalytics(slug, contest.id, token))
      setShowCodingResults(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load coding results.')
    }
  }

  const removeLearningItem = async (item) => {
    const confirmed = window.confirm(`Delete ${item.title}?`)
    if (!confirmed) {
      return
    }
    setError('')
    setMessage('')
    try {
      await deleteLearningItem(slug, item.id, token)
      await loadLearning()
      setMessage('Learning item deleted.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to delete learning item.')
    }
  }

  const renderLearningContent = () => {
    if (activeTab === 'quiz') {
      return renderQuizContent()
    }

    if (activeTab === 'coding') {
      return renderCodingContent()
    }

    if (activeTab === 'overview') {
      return (
        <section className="learning-main">
          <h2>{learning?.overview?.title || course.title}</h2>
          <p>{learning?.overview?.body || course.summary}</p>
          <dl className="course-facts">
            <div>
              <dt>Audience</dt>
              <dd>{course.audience}</dd>
            </div>
            <div>
              <dt>Modules</dt>
              <dd>{learning?.modules?.length || 0}</dd>
            </div>
            <div>
              <dt>Quizzes</dt>
              <dd>{learning?.quizzes?.length || 0}</dd>
            </div>
          </dl>
        </section>
      )
    }

    if (activeTab === 'content') {
      return (
        <section className="curriculum-board">
          <div className="curriculum-heading">
            <div className="curriculum-icon" aria-hidden="true">
              <span></span>
            </div>
            <div>
              <h2>Course Curriculum</h2>
              <p>Organize this course into modules and add specific topics for students.</p>
            </div>
          </div>
          {(learning?.modules || []).length === 0 ? (
            <div className="curriculum-empty">
              <div className="empty-folder" aria-hidden="true">
                <span></span>
              </div>
              <h3>No modules yet</h3>
              <p>Start by adding your first topic module to organize the course content.</p>
              {canManageLearning && (
                <button className="button primary" type="button" onClick={() => prepareNewItem('module')}>
                  Create first module
                </button>
              )}
            </div>
          ) : (
            <div className="learning-split">
              <aside className="module-list">
                {(learning?.modules || []).map((item) => (
                  <button
                    key={item.id}
                    className={selectedModule?.id === item.id ? 'active' : ''}
                    onClick={() => setSelectedModuleId(item.id)}
                  >
                    <span>Module {item.position}</span>
                    {item.title}
                  </button>
                ))}
              </aside>
              <article className="module-reader">
                {selectedModule && (
                  <>
                    <span className="eyebrow">Topic</span>
                    <h2>{selectedModule.title}</h2>
                    <p>{selectedModule.body}</p>
                  </>
                )}
              </article>
            </div>
          )}
        </section>
      )
    }

    return (
      <section className="learning-list">
        {visibleItems.length === 0 ? (
          <p>No {activeTab === 'quiz' ? 'quizzes' : 'videos'} added yet.</p>
        ) : (
          visibleItems.map((item) => (
            <article key={item.id} className="learning-row">
              <div>
                <span>{activeTab === 'quiz' ? 'Quiz' : 'Video'} {item.position}</span>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                {item.resource_url && (
                  <a href={item.resource_url} target="_blank" rel="noreferrer">
                    Open resource
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    )
  }

  const renderCodingContent = () => {
    const selectedContest = codingContests.find((contest) => contest.id === selectedContestId)
    const selectedQuestion = selectedContest?.questions?.find((question) => question.id === selectedQuestionId)

    if (canManageLearning) {
      return (
        <section className="trainer-assessment-page coding-studio-page">
          <div className="trainer-assessment-hero coding-studio-hero">
            <div>
              <span className="eyebrow">Coding Studio</span>
              <h2>Create hands-on coding tests</h2>
              <p>Design contests with starter code, scoring tests, and scheduled availability.</p>
            </div>
            <button className="button primary" type="button" onClick={() => setShowCodingBuilder(true)}>
              Create coding test
            </button>
          </div>

          <div className="coding-test-grid">
            {codingContests.length === 0 ? (
              <div className="assessment-empty">
                <h3>No coding tests published</h3>
                <p>Create a challenge set with starter code and automatic scoring.</p>
              </div>
            ) : (
              codingContests.map((contest) => (
                <article key={contest.id} className="coding-test-card">
                  <div className="coding-test-card-top">
                    <span>{contest.questions?.length || 0} questions</span>
                    <strong>{contest.title}</strong>
                  </div>
                  <p>{contest.description}</p>
                  <small>{formatQuizDateTime(contest.starts_at)} to {formatQuizDateTime(contest.ends_at)}</small>
                  <div className="coding-language-row">
                    {(contest.questions || []).slice(0, 4).map((question) => (
                      <span key={question.id}>{question.language}</span>
                    ))}
                  </div>
                  <div className="assessment-card-actions">
                    <button className="button secondary small" type="button" onClick={() => loadCodingAnalytics(contest)}>View results</button>
                    <button className="button danger small" type="button" onClick={() => removeCodingContest(contest)}>Delete</button>
                  </div>
                </article>
              ))
            )}
          </div>

          {showCodingBuilder && (
            <div className="modal-backdrop">
              <section className="trainer-modal coding-creation-modal">
                <div className="modal-heading">
                  <div>
                    <span className="eyebrow">Create Coding Test</span>
                    <h2>Challenge builder</h2>
                    <p>Add a question, starter code, and scoring rule before publishing.</p>
                  </div>
                  <button className="button secondary small" type="button" onClick={() => setShowCodingBuilder(false)}>Close</button>
                </div>
                <form className="quiz-builder-form polished-builder-form coding-builder-form" onSubmit={saveCodingContest}>
                  <input name="title" value={codingDraft.title} onChange={handleCodingDraftChange} placeholder="Contest title" required />
                  <input name="description" value={codingDraft.description} onChange={handleCodingDraftChange} placeholder="Short description" required />
                  <input name="starts_at" value={codingDraft.starts_at} onChange={handleCodingDraftChange} type="datetime-local" />
                  <input name="ends_at" value={codingDraft.ends_at} onChange={handleCodingDraftChange} type="datetime-local" />
                  <input name="question_title" value={codingDraft.question_title} onChange={handleCodingDraftChange} placeholder="Question title" />
                  <select name="language" value={codingDraft.language} onChange={handleCodingDraftChange}>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="web">HTML / CSS / JavaScript</option>
                  </select>
                  <textarea name="prompt" value={codingDraft.prompt} onChange={handleCodingDraftChange} placeholder="Problem statement" />
                  <textarea className="builder-code-box" name="starter_code" value={codingDraft.starter_code} onChange={handleCodingDraftChange} placeholder="Starter code" />
                  {codingDraft.language === 'web' ? (
                    <input name="check" value={codingDraft.check} onChange={handleCodingDraftChange} placeholder="Checklist text that must appear in code" />
                  ) : (
                    <>
                      <textarea name="stdin" value={codingDraft.stdin} onChange={handleCodingDraftChange} placeholder="Test input" />
                      <textarea name="expected_output" value={codingDraft.expected_output} onChange={handleCodingDraftChange} placeholder="Expected output" />
                    </>
                  )}
                  <input name="marks" value={codingDraft.marks} onChange={handleCodingDraftChange} type="number" min="1" />
                  <button className="button secondary" type="button" onClick={addCodingQuestion}>Add coding question</button>
                  <button className="button primary" type="submit">Publish contest</button>
                </form>
                <div className="draft-question-list compact-draft-list">
                  {draftCodingQuestions.map((question, index) => (
                    <article key={`${question.title}-${index}`}>
                      <span>{question.language} / {question.marks} marks</span>
                      <strong>{index + 1}. {question.title}</strong>
                      <small>Starter code and tests configured</small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {showCodingResults && codingAnalytics && (
            <div className="modal-backdrop">
              <section className="trainer-modal results-modal">
                <div className="modal-heading">
                  <div>
                    <span className="eyebrow">Coding Results</span>
                    <h2>{codingAnalytics.title}</h2>
                  </div>
                  <button className="button secondary small" type="button" onClick={() => setShowCodingResults(false)}>Close</button>
                </div>
                <div className="quiz-result-bars">
                  <div><span>Submissions</span><strong>{codingAnalytics.submissions}</strong></div>
                  <div><span>Passed</span><strong>{codingAnalytics.passed}</strong></div>
                  <div><span>Failed</span><strong>{codingAnalytics.failed}</strong></div>
                  <div><span>Avg score</span><strong>{codingAnalytics.average_score}</strong></div>
                </div>
                <div className="quiz-student-table">
                  {codingAnalytics.attempts.map((attempt) => (
                    <article key={attempt.id}>
                      <strong>{attempt.student_name || attempt.student_username || `Student ${attempt.user_id}`}</strong>
                      <span>{attempt.score}</span>
                      <small className={attempt.passed ? 'passed' : 'failed'}>{attempt.passed ? 'Passed' : 'Failed'}</small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>
      )
    }

    if (selectedQuestion) {
      return (
        <section className="coding-player">
          <div className="coding-player-top">
            <div>
              <span className="eyebrow">{selectedQuestion.language}</span>
              <h2>{selectedQuestion.title}</h2>
              <p>{selectedQuestion.prompt}</p>
            </div>
            <button className="button secondary small" type="button" onClick={() => setSelectedQuestionId(null)}>Back</button>
          </div>
          <textarea className="code-editor" value={codingAnswer} onChange={(event) => setCodingAnswer(event.target.value)} spellCheck="false" />
          <button className="button primary" type="button" onClick={submitCodingAnswer}>Submit answer</button>
          {codingResult && (
            <div className="runtime-output">
              <div>
                <strong>Result: {codingResult.passed ? 'Passed' : 'Needs practice'} | Score {codingResult.score}</strong>
                <pre>{codingResult.stdout || 'No output.'}</pre>
              </div>
              <div>
                <strong>Errors</strong>
                <pre>{codingResult.stderr || 'No errors.'}</pre>
              </div>
            </div>
          )}
        </section>
      )
    }

    return (
      <section className="coding-contest-page">
        {codingContests.length === 0 ? (
          <div className="curriculum-empty">
            <h3>No coding contests yet</h3>
            <p>Your trainer has not published coding contests for this course.</p>
          </div>
        ) : (
          <div className="coding-contest-grid">
            {codingContests.map((contest) => (
              <article key={contest.id} className="coding-contest-card">
                <div>
                  <span>{contest.questions?.length || 0} coding questions</span>
                  <h2>{contest.title}</h2>
                  <p>{contest.description}</p>
                  <small>Starts: {formatQuizDateTime(contest.starts_at)} | Ends: {formatQuizDateTime(contest.ends_at)}</small>
                </div>
                <div className="coding-question-list">
                  {contest.questions.map((question) => (
                    <button key={question.id} className="button primary small" type="button" onClick={() => startCodingQuestion(contest, question)}>
                      {question.title}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    )
  }

  const renderQuizContent = () => {
    if (canManageLearning) {
      return (
        <section className="trainer-assessment-page">
          <div className="trainer-assessment-hero">
            <div>
              <span className="eyebrow">Quiz Studio</span>
              <h2>Build and monitor course quizzes</h2>
              <p>Create assessments in a focused window. Correct answers stay hidden from students until review.</p>
            </div>
            <button className="button primary" type="button" onClick={() => setShowQuizBuilder(true)}>
              Create quiz
            </button>
          </div>

          <div className="assessment-card-grid">
            {quizzes.length === 0 ? (
              <div className="assessment-empty">
                <h3>No quizzes published</h3>
                <p>Create the first quiz for this course when your question set is ready.</p>
              </div>
            ) : (
              quizzes.map((quiz) => (
                <article key={quiz.id} className="assessment-card">
                  <div>
                    <span>{quiz.time_limit_minutes} min / pass {quiz.passing_score}%</span>
                    <h2>{quiz.title}</h2>
                    <p>{quiz.description}</p>
                    <small>{formatQuizDateTime(quiz.starts_at)} to {formatQuizDateTime(quiz.ends_at)}</small>
                  </div>
                  <button className="button secondary small" type="button" onClick={() => loadAnalytics(quiz)}>
                    View results
                  </button>
                </article>
              ))
            )}
          </div>

          {showQuizBuilder && (
            <div className="modal-backdrop">
              <section className="trainer-modal quiz-creation-modal">
                <div className="modal-heading">
                  <div>
                    <span className="eyebrow">Create Quiz</span>
                    <h2>Question builder</h2>
                    <p>Add options and mark the correct answer privately for grading.</p>
                  </div>
                  <button className="button secondary small" type="button" onClick={() => setShowQuizBuilder(false)}>Close</button>
                </div>
                <form className="quiz-builder-form polished-builder-form" onSubmit={saveQuiz}>
                  <input name="title" value={quizDraft.title} onChange={handleQuizDraftChange} placeholder="Quiz title" required />
                  <input name="description" value={quizDraft.description} onChange={handleQuizDraftChange} placeholder="Short description" required />
                  <input name="time_limit_minutes" value={quizDraft.time_limit_minutes} onChange={handleQuizDraftChange} type="number" min="1" />
                  <input name="passing_score" value={quizDraft.passing_score} onChange={handleQuizDraftChange} type="number" min="1" max="100" />
                  <input name="starts_at" value={quizDraft.starts_at} onChange={handleQuizDraftChange} type="datetime-local" />
                  <input name="ends_at" value={quizDraft.ends_at} onChange={handleQuizDraftChange} type="datetime-local" />
                  <textarea name="prompt" value={quizDraft.prompt} onChange={handleQuizDraftChange} placeholder="Question prompt" />
                  <select name="type" value={quizDraft.type} onChange={handleQuizDraftChange}>
                    <option value="single">Single option</option>
                    <option value="multiple">Multiple checkbox</option>
                  </select>
                  <textarea name="options" value={quizDraft.options} onChange={handleQuizDraftChange} placeholder={'Options, one per line\nExample:\nlet\nvar\nconst'} />
                  <input name="correct" value={quizDraft.correct} onChange={handleQuizDraftChange} placeholder="Correct letters hidden from students: A or A,C" />
                  <textarea name="explanation" value={quizDraft.explanation} onChange={handleQuizDraftChange} placeholder="Review explanation" />
                  <button className="button secondary" type="button" onClick={addDraftQuestion}>Add question</button>
                  <button className="button primary" type="submit">Publish quiz</button>
                </form>
                <div className="draft-question-list compact-draft-list">
                  {draftQuestions.map((question, index) => (
                    <article key={question.id}>
                      <span>Question {index + 1}</span>
                      <strong>{question.prompt}</strong>
                      <small>{question.options.length} options / answer hidden</small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {showQuizResults && quizAnalytics && (
            <div className="modal-backdrop">
              <section className="trainer-modal results-modal">
                <div className="modal-heading">
                  <div>
                    <span className="eyebrow">Quiz Results</span>
                    <h2>{quizAnalytics.title}</h2>
                  </div>
                  <button className="button secondary small" type="button" onClick={() => setShowQuizResults(false)}>Close</button>
                </div>
                <div className="quiz-result-bars">
                  <div style={{ '--value': `${quizAnalytics.pass_rate}%` }}><span>Pass rate</span><strong>{quizAnalytics.pass_rate}%</strong></div>
                  <div><span>Attempted</span><strong>{quizAnalytics.attempted}</strong></div>
                  <div><span>Passed</span><strong>{quizAnalytics.passed}</strong></div>
                  <div><span>Failed</span><strong>{quizAnalytics.failed}</strong></div>
                </div>
                <div className="quiz-student-table">
                  {quizAnalytics.attempts.map((attempt) => (
                    <article key={attempt.id}>
                      <strong>{attempt.student_name || attempt.student_username || `Student ${attempt.user_id}`}</strong>
                      <span>{attempt.score}%</span>
                      <small className={attempt.passed ? 'passed' : 'failed'}>{attempt.passed ? 'Passed' : 'Failed'}</small>
                    </article>
                  ))}
                  {quizAnalytics.not_attempted?.map((request) => (
                    <article key={`pending-${request.user_id}`}>
                      <strong>{request.student_name || request.student_username || `Student ${request.user_id}`}</strong>
                      <span>--</span>
                      <small>Not attempted</small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>
      )
    }

    if (quizReview) {
      return (
        <section className="quiz-review-page">
          <div className="quiz-score-card">
            <span>{quizReview.attempt.passed ? 'Passed' : 'Try again'}</span>
            <strong>{quizReview.attempt.score}%</strong>
            <p>{quizReview.attempt.score >= 80 ? 'Strong work. Review the answers below.' : 'Review the corrections and practice once more.'}</p>
            <button className="button primary small" type="button" onClick={returnToQuizList}>
              Back to quizzes
            </button>
          </div>
          {quizReview.questions.map((question) => (
            <article key={question.id} className={`review-question ${question.is_correct ? 'correct' : 'wrong'}`}>
              <h3>{question.prompt}</h3>
              {question.options.map((option) => (
                <p key={option.id}>
                  <strong>{option.id}.</strong> {option.text}
                  {question.selected_option_ids.includes(option.id) && <span> Your answer</span>}
                  {question.correct_option_ids.includes(option.id) && <span> Correct</span>}
                </p>
              ))}
              {question.explanation && <small>{question.explanation}</small>}
            </article>
          ))}
        </section>
      )
    }

    if (quizDetail) {
      const question = quizDetail.questions[currentQuestionIndex]
      return (
        <section className="quiz-player">
          <div className="quiz-player-top">
            <div>
              <span className="eyebrow">Question {currentQuestionIndex + 1} of {quizDetail.questions.length}</span>
              <h2>{quizDetail.title}</h2>
            </div>
            <strong>{formatTime(timeLeft)}</strong>
          </div>
          <div className="quiz-progress"><span style={{ width: `${((currentQuestionIndex + 1) / quizDetail.questions.length) * 100}%` }}></span></div>
          <article className="quiz-question-card">
            <h3>{question.prompt}</h3>
            <div className="quiz-options">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  className={(quizAnswers[question.id] || []).includes(option.id) ? 'selected' : ''}
                  onClick={() => toggleAnswer(question, option.id)}
                  type="button"
                >
                  <span>{option.id}</span>
                  {option.text}
                </button>
              ))}
            </div>
          </article>
          <div className="quiz-nav">
            <button className="button secondary" disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((value) => value - 1)}>Previous</button>
            {currentQuestionIndex === quizDetail.questions.length - 1 ? (
              <button className="button primary" onClick={handleSubmitQuiz}>Submit quiz</button>
            ) : (
              <button className="button primary" onClick={() => setCurrentQuestionIndex((value) => value + 1)}>Next</button>
            )}
          </div>
        </section>
      )
    }

    return (
      <section className="quiz-student-list">
        {quizzes.length === 0 ? (
          <div className="curriculum-empty">
            <h3>No quizzes yet</h3>
            <p>Your trainer has not published quizzes for this course.</p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <article key={quiz.id} className="student-quiz-card">
              <div>
                <span>{quiz.time_limit_minutes} min</span>
                <h2>{quiz.title}</h2>
                <p>{quiz.description}</p>
                <div className="quiz-schedule">
                  <small>Starts: {formatQuizDateTime(quiz.starts_at)}</small>
                  <small>Ends: {formatQuizDateTime(quiz.ends_at)}</small>
                </div>
                {quiz.attempted && <small>Last score: {quiz.last_score}% - {quiz.passed ? 'Passed' : 'Failed'}</small>}
              </div>
              <div>
                <button className="button primary small" onClick={() => startQuiz(quiz)}>{quiz.attempted ? 'Retake' : 'Start quiz'}</button>
                {quiz.attempted && <button className="button secondary small" onClick={async () => setQuizReview(await fetchQuizReview(slug, quiz.id, token))}>Results</button>}
              </div>
            </article>
          ))
        )}
      </section>
    )
  }

  if (!course) {
    return <section className="course-learning-page">Loading...</section>
  }

  if (!hasApprovedAccess) {
    const isTrainerCourseRequest = user?.role === 'trainer'
    return (
      <section className="course-access-page">
        <div className="course-access-header">
          <span className="eyebrow">{isTrainerCourseRequest ? 'Teaching Approval' : 'Course Access'}</span>
          <h1>{course.title}</h1>
          <p>{course.summary}</p>
          <p className="meta">Audience: {course.audience}</p>
          {isTrainerCourseRequest ? (
            trainerTeachStatus === 'pending' ? (
              <div className="status-note pending">Your teaching request is pending admin approval.</div>
            ) : trainerTeachStatus === 'rejected' ? (
              <>
                <div className="status-note rejected">Your teaching request was rejected.</div>
                <button className="button primary" onClick={handleRequestToTeach}>
                  Request again
                </button>
              </>
            ) : (
              <button className="button primary" onClick={handleRequestToTeach}>
                Request to teach this course
              </button>
            )
          ) : accessStatus === 'pending' ? (
            <div className="status-note pending">Your request is pending admin approval.</div>
          ) : accessStatus === 'rejected' ? (
            <div className="status-note rejected">Your request was rejected. Please contact the admin team.</div>
          ) : (
            <button className="button primary" onClick={handleRequestAccess}>
              Request access from admin
            </button>
          )}
          {message && <div className="success-box">{message}</div>}
          {error && <div className="alert">{error}</div>}
        </div>
      </section>
    )
  }

  return (
    <section className={canManageLearning ? 'course-learning-page trainer-course-builder' : 'course-learning-page'}>
      <header className={canManageLearning ? 'builder-header' : 'learning-header'}>
        <div>
          <span className="eyebrow">{canManageLearning ? 'Course Content Manager' : 'Course'}</span>
          <h1>{course.title}</h1>
          <p>{canManageLearning ? 'Manage course content, categories, topics, quizzes, and video resources.' : course.summary}</p>
        </div>
        {canManageLearning && activeTab === 'content' && (
          <button className="button primary" type="button" onClick={() => prepareNewItem('module')}>
            Add Content
          </button>
        )}
        {canManageLearning && activeTab === 'videos' && (
          <button className="button primary" type="button" onClick={() => prepareNewItem('video')}>
            Add Video
          </button>
        )}
      </header>

      <nav className="course-tabs" aria-label="Course sections">
        {tabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </nav>

      {message && <div className="success-box">{message}</div>}
      {error && <div className="alert">{error}</div>}

      {canManageLearning && showEditor && (
        <div className="modal-backdrop">
        <section className="trainer-modal builder-editor-panel">
          <div className="trainer-tools-heading">
            <div>
              <span className="eyebrow">{editingItem ? 'Update content' : 'Create content'}</span>
              <h2>{editingItem ? 'Edit material' : 'Add learning material'}</h2>
            </div>
            <button className="button secondary small" type="button" onClick={resetForm}>
              Close
            </button>
          </div>
          <div className="trainer-quick-add">
            <button type="button" onClick={() => prepareNewItem('module')}>Module</button>
            <button type="button" onClick={() => prepareNewItem('video')}>Video</button>
          </div>
          <form className="builder-editor-form" onSubmit={saveLearningItem}>
            <div className="field-group">
              <label>Section</label>
              <select name="kind" value={form.kind} onChange={handleFormChange}>
                <option value="overview">Overview</option>
                <option value="module">Content module</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div className="field-group">
              <label>Title</label>
              <input name="title" value={form.title} onChange={handleFormChange} required />
            </div>
            <div className="field-group wide">
              <label>Details</label>
              <textarea name="body" value={form.body} onChange={handleFormChange} required />
            </div>
            <div className="field-group">
              <label>Link</label>
              <input name="resource_url" value={form.resource_url} onChange={handleFormChange} />
            </div>
            <div className="field-group">
              <label>Order</label>
              <input name="position" value={form.position} onChange={handleFormChange} type="number" min="0" />
            </div>
            <button className="button primary" type="submit">
              {editingItem ? 'Update material' : 'Add material'}
            </button>
          </form>
        </section>
        </div>
      )}

      <div className={canManageLearning ? 'builder-content-layout' : 'learning-layout'}>
        {renderLearningContent()}

        {canManageLearning && activeTab !== 'quiz' && activeTab !== 'coding' && (
          <section className="builder-material-list">
            <div className="builder-list-heading">
              <span className="eyebrow">Added Material</span>
              <h2>{activeTab === 'videos' ? 'Video library' : activeTab === 'overview' ? 'Overview material' : 'Course content'}</h2>
            </div>
            <div className="trainer-item-list">
              {managedItems.map((item) => (
                  <article key={item.id}>
                    <div>
                      <span>{item.kind}</span>
                      <strong>{item.title}</strong>
                    </div>
                    <div>
                      <button className="button secondary small" onClick={() => beginEdit(item)}>
                        Edit
                      </button>
                      <button className="button danger small" onClick={() => removeLearningItem(item)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
      </div>
    </section>
  )
}

export default CourseDetail
