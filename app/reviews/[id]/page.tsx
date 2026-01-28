'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'

interface ReviewSubmission {
  id: string
  assignmentTitle: string
  submittedBy: string
  language: string
  code: string
  submittedAt: string
}

const mockReviewData: Record<string, ReviewSubmission> = {
  '1': {
    id: '1',
    assignmentTitle: 'Binary Search Tree Implementation',
    submittedBy: 'mattdchr',
    language: 'typescript',
    code: `class TreeNode {
  val: number
  left: TreeNode | null
  right: TreeNode | null

  constructor(val: number) {
    this.val = val
    this.left = null
    this.right = null
  }
}

class BinarySearchTree {
  root: TreeNode | null

  constructor() {
    this.root = null
  }

  insert(val: number): void {
    const newNode = new TreeNode(val)
    if (this.root === null) {
      this.root = newNode
      return
    }
    let current = this.root
    while (true) {
      if (val === current.val) return
      if (val < current.val) {
        if (current.left === null) {
          current.left = newNode
          return
        }
        current = current.left
      } else {
        if (current.right === null) {
          current.right = newNode
          return
        }
        current = current.right
      }
    }
  }
}`,
    submittedAt: '2026-01-20T10:30:00Z',
  },
  '2': {
    id: '2',
    assignmentTitle: 'REST API Design',
    submittedBy: 'alexjohn',
    language: 'python',
    code: `from flask import Flask, jsonify, request

app = Flask(__name__)

users = [
  {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'},
  {'id': 2, 'name': 'Bob', 'email': 'bob@example.com'},
]

@app.route('/api/users', methods=['GET'])
def get_users():
  return jsonify(users)

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
  user = next((u for u in users if u['id'] == user_id), None)
  if not user:
    return jsonify({'error': 'User not found'}), 404
  return jsonify(user)

@app.route('/api/users', methods=['POST'])
def create_user():
  data = request.get_json()
  new_user = {
    'id': len(users) + 1,
    'name': data.get('name'),
    'email': data.get('email')
  }
  users.append(new_user)
  return jsonify(new_user), 201

if __name__ == '__main__':
  app.run(debug=True)`,
    submittedAt: '2026-01-22T14:15:00Z',
  },
  '3': {
    id: '3',
    assignmentTitle: 'Database Normalization Exercise',
    submittedBy: 'sarahlee',
    language: 'sql',
    code: `CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);`,
    submittedAt: '2026-01-25T09:45:00Z',
  },
}

export default function ReviewPage() {
  const params = useParams()
  const id = params?.id as string
  const review = mockReviewData[id]
  const [comment, setComment] = useState('')

  const handleSubmitReview = () => {
    console.log('Review submitted:', {
      reviewId: id,
      comment,
    })
    alert(`Review submitted for ${review?.assignmentTitle}`)
  }

  if (!review) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Review Not Found</h1>
          </div>
          <Link href="/reviews" className="btn btn-secondary">
            Back to Reviews
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Review Code</h1>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">{review.assignmentTitle}</h2>
            <div className="section-content">
              <div className="card-details">
                <p>
                  <strong>Submitted by:</strong> {review.submittedBy}
                </p>
                <p>
                  <strong>Language:</strong> {review.language}
                </p>
                <p>
                  <strong>Submitted at:</strong>{' '}
                  {new Date(review.submittedAt).toLocaleString()}
                </p>
              </div>

              <div className="form-field" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Code Submission</label>
                <pre className="code-preview">
                  <code>{review.code}</code>
                </pre>
              </div>

              <div className="form-field" style={{ marginTop: '1.5rem' }}>
                <label htmlFor="comment" className="form-label">
                  Overall Comment
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Enter your review comments here..."
                  className="form-textarea"
                  rows={8}
                />
              </div>

              <div className="review-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  onClick={handleSubmitReview}
                  className="btn btn-primary"
                  disabled={!comment.trim()}
                >
                  Submit Review
                </button>
                <Link href="/reviews" className="btn btn-secondary">
                  Back to Reviews
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
