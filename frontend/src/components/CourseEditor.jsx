import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createCourse, fetchCourse, fetchCourses, getAssetUrl, updateCourse, uploadCourseThumbnail } from '../api'

const emptyCourseForm = {
  title: '',
  slug: '',
  summary: '',
  audience: '',
}

const makeSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const CourseEditor = ({ token }) => {
  const { slug } = useParams()
  const [courses, setCourses] = useState([])
  const [courseForm, setCourseForm] = useState(emptyCourseForm)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [editingCourse, setEditingCourse] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (slug) {
      fetchCourse(slug)
        .then((course) => {
          setCourses([])
          handleEditCourse(course)
        })
        .catch(() => setError('Unable to load course.'))
      return
    }
    fetchCourses()
      .then(setCourses)
      .catch(() => setError('Unable to load courses.'))
  }, [slug])

  const handleCourseFormChange = (event) => {
    const { name, value } = event.target
    setCourseForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'title' && !editingCourse ? { slug: makeSlug(value) } : {}),
    }))
  }

  const resetCourseForm = () => {
    setCourseForm(emptyCourseForm)
    setThumbnailFile(null)
    setEditingCourse(null)
  }

  const handleEditCourse = (course) => {
    setMessage('')
    setError('')
    setEditingCourse(course)
    setThumbnailFile(null)
    setCourseForm({
      title: course.title,
      slug: course.slug,
      summary: course.summary,
      audience: course.audience,
    })
  }

  const handleSaveCourse = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      const savedCourse = editingCourse
        ? await updateCourse(editingCourse.slug, courseForm, token)
        : await createCourse(courseForm, token)
      const courseWithThumbnail = thumbnailFile
        ? await uploadCourseThumbnail(savedCourse.slug, thumbnailFile, token)
        : savedCourse
      setCourses((prev) =>
        editingCourse
          ? prev.map((course) => (course.id === courseWithThumbnail.id ? courseWithThumbnail : course))
          : [...prev, courseWithThumbnail],
      )
      setMessage(editingCourse ? `${courseWithThumbnail.title} updated successfully.` : `${courseWithThumbnail.title} added successfully.`)
      if (!slug) {
        resetCourseForm()
      } else {
        setEditingCourse(courseWithThumbnail)
        setThumbnailFile(null)
        setCourseForm({
          title: courseWithThumbnail.title,
          slug: courseWithThumbnail.slug,
          summary: courseWithThumbnail.summary,
          audience: courseWithThumbnail.audience,
        })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to save course.')
    }
  }

  return (
    <section className="admin-courses-page">
      <div className="section-header">
        <span className="eyebrow">Course editor</span>
        <h1>{slug ? 'Update course' : 'Add or update courses'}</h1>
        <p>{slug ? 'Edit the selected course details.' : 'Create new learning tracks or select an existing course to update its details.'}</p>
      </div>
      <form className="course-form-card" onSubmit={handleSaveCourse}>
        <div className="form-heading">
          <div>
            <span className="eyebrow">{editingCourse ? 'Update course' : 'Add new course'}</span>
            <h2>{editingCourse ? editingCourse.title : 'Create learning track'}</h2>
          </div>
          {editingCourse && !slug && (
            <button className="button secondary small" type="button" onClick={resetCourseForm}>
              Cancel
            </button>
          )}
        </div>
        <div className="course-form-grid">
          <div className="field-group">
            <label>Course title</label>
            <input name="title" value={courseForm.title} onChange={handleCourseFormChange} required />
          </div>
          <div className="field-group">
            <label>Course slug</label>
            <input name="slug" value={courseForm.slug} onChange={handleCourseFormChange} required />
          </div>
          <div className="field-group wide">
            <label>Summary</label>
            <textarea name="summary" value={courseForm.summary} onChange={handleCourseFormChange} required />
          </div>
          <div className="field-group wide">
            <label>Audience</label>
            <input name="audience" value={courseForm.audience} onChange={handleCourseFormChange} required />
          </div>
          <div className="field-group wide thumbnail-upload-field">
            <label>Course thumbnail image</label>
            {editingCourse?.thumbnail_image_url && (
              <img className="course-editor-thumb" src={getAssetUrl(editingCourse.thumbnail_image_url)} alt={`${editingCourse.title} thumbnail`} />
            )}
            <input type="file" accept="image/*" onChange={(event) => setThumbnailFile(event.target.files?.[0] || null)} />
            <small>Upload a Java, Python, SQL, DevOps, or course-specific image. It will appear on course cards.</small>
          </div>
        </div>
        <button className="button primary" type="submit">
          {editingCourse ? 'Update course' : 'Add course'}
        </button>
      </form>
      {message && <div className="success-box">{message}</div>}
      {error && <div className="alert">{error}</div>}
      {!slug && (
        <div className="editor-course-list">
          {courses.map((course) => (
            <article key={course.id} className="editor-course-row">
              <div>
                <h2>{course.title}</h2>
                <small>{course.slug}</small>
              </div>
              <button className="button secondary small" onClick={() => handleEditCourse(course)}>
                Edit
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default CourseEditor
