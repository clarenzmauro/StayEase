import '../PropertyPage.css';

import { useState } from 'react';

interface Comment {
  id: string;
  userEmail: string;
  content: string;
  commentDate: any;
  likesCounter: number;
  likedBy: string[];
  userId: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  comments: Comment[];
  user: any;
  newComment: string;
  onCommentChange: (value: string) => void;
  onCommentSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onLikeComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReplySubmit: (commentId: string, content: string) => void;
  onReplyLike: (commentId: string, replyId: string) => void;
  onDeleteReply: (commentId: string, replyId: string) => void;
}

const CommentSection = ({
  comments,
  user,
  newComment,
  onCommentChange,
  onCommentSubmit,
  onLikeComment,
  onDeleteComment,
  onReplySubmit,
  onReplyLike,
  onDeleteReply
}: CommentSectionProps) => {
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [likeSort, setLikeSort] = useState<'mostLiked' | 'leastLiked'>('mostLiked');
  const [activeSortType, setActiveSortType] = useState<'date' | 'likes'>('date');
  const [visibleComments, setVisibleComments] = useState(5);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const COMMENTS_PER_PAGE = 5;

  const handleDateSort = () => {
    if (activeSortType !== 'date') {
      setActiveSortType('date');
      setDateSort('newest');
    } else {
      setDateSort(prev => prev === 'newest' ? 'oldest' : 'newest');
    }
  };

  const handleLikeSort = () => {
    if (activeSortType !== 'likes') {
      setActiveSortType('likes');
      setLikeSort('mostLiked');
    } else {
      setLikeSort(prev => prev === 'mostLiked' ? 'leastLiked' : 'mostLiked');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      return '';
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const handleLoadMoreComments = () => {
    setVisibleComments(prev => prev + COMMENTS_PER_PAGE);
  };

  const renderComments = () => {
    const sortedComments = comments
      .sort((a, b) => {
        if (!a.commentDate || !b.commentDate) return 0;
        const aMillis = a.commentDate.toMillis ? a.commentDate.toMillis() : 0;
        const bMillis = b.commentDate.toMillis ? b.commentDate.toMillis() : 0;
        return activeSortType === 'date' 
          ? dateSort === 'newest' ? bMillis - aMillis : aMillis - bMillis
          : likeSort === 'mostLiked' ? (b.likesCounter || 0) - (a.likesCounter || 0) : (a.likesCounter || 0) - (b.likesCounter || 0);
      });

    return sortedComments
      .slice(0, visibleComments)
      .map((comment) => (
        <div key={comment.id} className="comment">
          <div className="comment-header">
            <span className="comment-author">{comment.userEmail}</span>
            <span className="comment-date">{formatDate(comment.commentDate)}</span>
          </div>
          <div className="comment-content">{comment.content}</div>
          <div className="comment-actions">
            <button 
              className="action-button reply-button"
              onClick={() => setReplyingTo(comment.id)}
            >
              💬 Reply
            </button>
            <button 
              className={`action-button like-button ${comment.likedBy?.includes(user?.uid || '') ? 'liked' : ''}`}
              onClick={() => onLikeComment(comment.id)}
            >
              {comment.likedBy?.includes(user?.uid || '') ? '❤️' : '🤍'} {comment.likesCounter || 0}
            </button>
            {user?.uid === comment.userId && (
              <button 
                className="action-button delete-button"
                onClick={() => onDeleteComment(comment.id)}
              >
                🗑️
              </button>
            )}
          </div>
          
          {replyingTo === comment.id && (
            <div className="reply-form">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="reply-input"
              />
              <div className="reply-buttons">
                <button 
                  className="submit-reply"
                  onClick={() => {
                    onReplySubmit(comment.id, replyContent);
                    setReplyContent('');
                    setReplyingTo(null);
                  }}
                >
                  Reply
                </button>
                <button 
                  className="cancel-reply"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="replies-section">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="reply-comment">
                  <div className="comment-header">
                    <span className="comment-author">{reply.userEmail}</span>
                    <span className="comment-date">{formatDate(reply.commentDate)}</span>
                  </div>
                  <div className="comment-content">{reply.content}</div>
                  <div className="comment-actions">
                    <button 
                      className={`action-button like-button ${reply.likedBy?.includes(user?.uid || '') ? 'liked' : ''}`}
                      onClick={() => onReplyLike(comment.id, reply.id)}
                    >
                      {reply.likedBy?.includes(user?.uid || '') ? '❤️' : '🤍'} {reply.likesCounter || 0}
                    </button>
                    {user?.uid === reply.userId && (
                      <button 
                        className="action-button delete-button"
                        onClick={() => onDeleteReply(comment.id, reply.id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ));
  };

  return (
    <div className="comments-section">
      <div className="comments-header">
        <h2>Comments ({comments.length})</h2>
        <div className="sort-buttons">
          <button 
            className={`sort-button ${activeSortType === 'date' ? 'active' : ''}`}
            onClick={handleDateSort}
          >
            Sort by {dateSort === 'newest' ? 'Oldest' : 'Newest'}
          </button>
          <button 
            className={`sort-button ${activeSortType === 'likes' ? 'active' : ''}`}
            onClick={handleLikeSort}
          >
            Sort by {likeSort === 'mostLiked' ? 'Least' : 'Most'} Liked
          </button>
        </div>
      </div>
      <form onSubmit={onCommentSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Write a comment..."
          required
        />
        <button type="submit">Post Comment</button>
      </form>
      
      <div className="comments-list">
        {renderComments()}
        {comments.length > visibleComments && (
          <div className="load-more-container">
            <button 
              className="load-more-button"
              onClick={handleLoadMoreComments}
            >
              See more comments ({comments.length - visibleComments} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
