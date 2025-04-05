import { useState, useRef, useEffect } from "react";

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
  onDeleteReply,
}: CommentSectionProps) => {
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [likeSort, setLikeSort] = useState<"mostLiked" | "leastLiked">(
    "mostLiked"
  );
  const [activeSortType, setActiveSortType] = useState<"date" | "likes">(
    "date"
  );
  const [visibleComments, setVisibleComments] = useState(4);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const COMMENTS_PER_PAGE = 4;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSortChange = (
    sortType: "date" | "likes",
    value: "newest" | "oldest" | "mostLiked" | "leastLiked"
  ) => {
    if (sortType === "date") {
      setDateSort(value as "newest" | "oldest");
      setActiveSortType("date");
    } else {
      setLikeSort(value as "mostLiked" | "leastLiked");
      setActiveSortType("likes");
    }
    setIsDropdownOpen(false);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString();
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      return "";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  const handleLoadMoreComments = () => {
    setVisibleComments((prev) => prev + COMMENTS_PER_PAGE);
  };

  const handleSeeLessComments = () => {
    setVisibleComments(COMMENTS_PER_PAGE);
  };

  const DropDown = () => {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <label htmlFor="sort" className="flex items-center gap-1 font-medium">
          <i className="fa-solid fa-sort" />
          Sort
        </label>
        <select
          id="sort"
          name="sort"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="mostLiked">Most Liked</option>
          <option value="leastLiked">Least Liked</option>
        </select>
      </div>
    );
  };
  

  const CommentForm = () => {
    return (
      <form onSubmit={onCommentSubmit} className="px-4 w-full">
        <textarea
          className="p-3 border border-gray-300 rounded-xl w-full focus:border-indigo-400"
          value={newComment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Share your thoughts about this property..."
          required
        />
        <button
          className="py-1 bg-indigo-400 rounded-lg text-white mb-3 w-full"
          type="submit"
        >
          Post Comment
        </button>
      </form>
    );
  };

  const ReplyForm = (comment: any) => {
    return (
      <>
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
                  setReplyContent("");
                  setReplyingTo(null);
                }}
              >
                Reply
              </button>
              <button
                className="cancel-reply"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const Replies = (comment: any) => {
    return (
      <>
        {comment.replies && comment.replies.length > 0 && (
          <div className="replies-section">
            {comment.replies.map((reply: any) => (
              <div key={reply.id} className="reply">
                <div className="reply-header">
                  <span className="reply-author">{reply.userEmail}</span>
                  <span className="reply-date">
                    {formatDate(reply.commentDate)}
                  </span>
                </div>
                <div className="reply-content">{reply.content}</div>
                <div className="reply-actions">
                  <button
                    className={`action-button like-button ${
                      reply.likedBy?.includes(user?.uid || "") ? "liked" : ""
                    }`}
                    onClick={() => onReplyLike(comment.id, reply.id)}
                  >
                    {reply.likedBy?.includes(user?.uid || "") ? "❤️" : "🤍"}{" "}
                    {reply.likesCounter || 0}
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
      </>
    );
  };

  const Comments = () => {
    const sortedComments = comments.sort((a, b) => {
      if (!a.commentDate || !b.commentDate) return 0;
      const aMillis = a.commentDate.toMillis ? a.commentDate.toMillis() : 0;
      const bMillis = b.commentDate.toMillis ? b.commentDate.toMillis() : 0;
      return activeSortType === "date"
        ? dateSort === "newest"
          ? bMillis - aMillis
          : aMillis - bMillis
        : likeSort === "mostLiked"
        ? (b.likesCounter || 0) - (a.likesCounter || 0)
        : (a.likesCounter || 0) - (b.likesCounter || 0);
    });

    return sortedComments.slice(0, visibleComments).map((comment) => (
      <div
        className="mx-4 p-3 border border-gray-300 rounded-xl mb-2"
        key={comment.id}
      >
        <p className="font-semibold mb-0.5">{comment.userEmail}</p>
        <p>{comment.content}</p>

        <div className="flex justify-around items-center mt-2 pt-2 border-t-1 border-gray-300">
          <button onClick={() => setReplyingTo(comment.id)}>
            <i className="fa-solid fa-reply me-2"></i>
            Reply
          </button>

          <button onClick={() => onLikeComment(comment.id)}>
            {comment.likedBy?.includes(user?.uid || "") ? (
              <i className="fa-solid fa-heart me-2 text-indigo-400"></i>
            ) : (
              <i className="fa-regular fa-heart me-2"></i>
            )}
            {comment.likesCounter || 0}
          </button>

          {/* TODO: Convert to other format (Jan 01, 2000) */}
          <p className="text-sm font-light">
            {formatDate(comment.commentDate)}
          </p>

          {user?.uid === comment.userId && (
            <button onClick={() => onDeleteComment(comment.id)}>🗑️</button>
          )}
        </div>

        <Replies comments={comment} />
        <ReplyForm comment={comment} />
      </div>
    ));
  };

  const MoreComments = () => {
    return (
      <div className="mx-4 font-semibold text-sm text-center text-indigo-400">
        {comments.length > visibleComments ? (
          <button
            className="py-1 border-1 rounded-md w-full"
            onClick={handleLoadMoreComments}
          >
            See more comments ({comments.length - visibleComments})
          </button>
        ) : comments.length > COMMENTS_PER_PAGE ? (
          <button
            className="py-1 border-1 rounded-md w-full"
            onClick={handleSeeLessComments}
          >
            See less comments
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="py-8">
      <div className="flex justify-between px-4 mb-2">
        <h2 className="text-xl font-semibold">Comments ({comments.length})</h2>
        <DropDown />
      </div>

      <CommentForm />
      <Comments />
      <MoreComments />
    </div>
  );
};

export default CommentSection;

{
  /* <div className="comments-section">
  <div className="comments-header">
    <h2>Comments ({comments.length})</h2>
    <div className="sort-buttons" ref={dropdownRef}>
      <button 
        className="sort-dropdown-button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        Sort by: {activeSortType === 'date' 
          ? `Date (${dateSort})` 
          : `Likes (${likeSort})`}
      </button>
      <div className={`sort-dropdown-content ${isDropdownOpen ? 'show' : ''}`}>
        <div 
          className={`sort-option ${activeSortType === 'date' && dateSort === 'newest' ? 'active' : ''}`}
          onClick={() => handleSortChange('date', 'newest')}
        >
          Newest First
        </div>
        <div 
          className={`sort-option ${activeSortType === 'date' && dateSort === 'oldest' ? 'active' : ''}`}
          onClick={() => handleSortChange('date', 'oldest')}
        >
          Oldest First
        </div>
        <div 
          className={`sort-option ${activeSortType === 'likes' && likeSort === 'mostLiked' ? 'active' : ''}`}
          onClick={() => handleSortChange('likes', 'mostLiked')}
        >
          Most Liked
        </div>
        <div 
          className={`sort-option ${activeSortType === 'likes' && likeSort === 'leastLiked' ? 'active' : ''}`}
          onClick={() => handleSortChange('likes', 'leastLiked')}
        >
          Least Liked
        </div>
      </div>
    </div>
  </div>

  <div className="comments-list">
    {renderComments()}
    <div className="load-more-container">
      {comments.length > visibleComments ? (
        <button 
          className="load-more-button"
          onClick={handleLoadMoreComments}
        >
          See more comments ({comments.length - visibleComments} remaining)
        </button>
      ) : comments.length > COMMENTS_PER_PAGE ? (
        <button 
          className="load-more-button"
          onClick={handleSeeLessComments}
        >
          See less comments
        </button>
      ) : null}
    </div>
  </div>

  <form onSubmit={onCommentSubmit} className="comment-form">
    <textarea
      value={newComment}
      onChange={(e) => onCommentChange(e.target.value)}
      placeholder="Share your thoughts about this property..."
      required
    />
    <div className="comment-form-footer">
      <span className="comment-guidelines">
        Please keep comments respectful and relevant to the property
      </span>
      <button type="submit">
        Post Comment
      </button>
    </div>
  </form>
</div> */
}

// ---------------------- render comments

// const sortedComments = comments
//   .sort((a, b) => {
//     if (!a.commentDate || !b.commentDate) return 0;
//     const aMillis = a.commentDate.toMillis ? a.commentDate.toMillis() : 0;
//     const bMillis = b.commentDate.toMillis ? b.commentDate.toMillis() : 0;
//     return activeSortType === 'date'
//       ? dateSort === 'newest' ? bMillis - aMillis : aMillis - bMillis
//       : likeSort === 'mostLiked' ? (b.likesCounter || 0) - (a.likesCounter || 0) : (a.likesCounter || 0) - (b.likesCounter || 0);
//   });

// return sortedComments
//   .slice(0, visibleComments)
//   .map((comment) => (
//     <div key={comment.id} className="comment">
//       <div className="comment-header">
//         <span className="comment-author">{comment.userEmail}</span>
//         <span className="comment-date">{formatDate(comment.commentDate)}</span>
//       </div>
//       <div className="comment-content">{comment.content}</div>
//       <div className="comment-actions">
//         <button
//           className="action-button reply-button"
//           onClick={() => setReplyingTo(comment.id)}
//         >
//           💬 Reply
//         </button>
//         <button
//           className={`action-button like-button ${comment.likedBy?.includes(user?.uid || '') ? 'liked' : ''}`}
//           onClick={() => onLikeComment(comment.id)}
//         >
//           {comment.likedBy?.includes(user?.uid || '') ? '❤️' : '🤍'} {comment.likesCounter || 0}
//         </button>
//         {user?.uid === comment.userId && (
//           <button
//             className="action-button delete-button"
//             onClick={() => onDeleteComment(comment.id)}
//           >
//             🗑️
//           </button>
//         )}
//       </div>

//       Replies section
//       {comment.replies && comment.replies.length > 0 && (
//         <div className="replies-section">
//           {comment.replies.map((reply) => (
//             <div key={reply.id} className="reply">
//               <div className="reply-header">
//                 <span className="reply-author">{reply.userEmail}</span>
//                 <span className="reply-date">{formatDate(reply.commentDate)}</span>
//               </div>
//               <div className="reply-content">{reply.content}</div>
//               <div className="reply-actions">
//                 <button
//                   className={`action-button like-button ${reply.likedBy?.includes(user?.uid || '') ? 'liked' : ''}`}
//                   onClick={() => onReplyLike(comment.id, reply.id)}
//                 >
//                   {reply.likedBy?.includes(user?.uid || '') ? '❤️' : '🤍'} {reply.likesCounter || 0}
//                 </button>
//                 {user?.uid === reply.userId && (
//                   <button
//                     className="action-button delete-button"
//                     onClick={() => onDeleteReply(comment.id, reply.id)}
//                   >
//                     🗑️
//                   </button>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       Reply form
//       {replyingTo === comment.id && (
//         <div className="reply-form">
//           <textarea
//             value={replyContent}
//             onChange={(e) => setReplyContent(e.target.value)}
//             placeholder="Write a reply..."
//             className="reply-input"
//           />
//           <div className="reply-buttons">
//             <button
//               className="submit-reply"
//               onClick={() => {
//                 onReplySubmit(comment.id, replyContent);
//                 setReplyContent('');
//                 setReplyingTo(null);
//               }}
//             >
//               Reply
//             </button>
//             <button
//               className="cancel-reply"
//               onClick={() => {
//                 setReplyingTo(null);
//                 setReplyContent('');
//               }}
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   ));
