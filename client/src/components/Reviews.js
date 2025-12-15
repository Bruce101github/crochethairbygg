"use client";

import { useState, useEffect } from "react";
import { HiStar } from "react-icons/hi";
import toast from "react-hot-toast";

export default function Reviews({ productId, canReview, onReviewSubmitted }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  async function fetchReviews() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/?product=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!accessToken) {
      toast.error("Please sign in to submit a review");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          product: productId,
          rating: formData.rating,
          comment: formData.comment,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Review submitted successfully!");
        setFormData({ rating: 5, comment: "" });
        setShowForm(false);
        fetchReviews();
        if (onReviewSubmitted) {
          onReviewSubmitted();
        }
      } else {
        toast.error(data.detail || data.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Error submitting review");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="py-8">
        <p className="text-gray-600 dark:text-gray-400">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="py-8 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reviews ({reviews.length})
        </h2>
        {canReview && accessToken && !showForm && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#FF6B9D] text-white rounded-lg hover:bg-[#FF5A8A] transition font-semibold"
          >
            Write a Review
          </button>
        )}
        {showForm && (
          <button
            onClick={() => setShowForm(false)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Prompt for users who can review but haven't shown the form */}
      {canReview && accessToken && !showForm && (
        <div className="mb-6 p-4 bg-[#FF6B9D]/10 dark:bg-[#FF6B9D]/20 border border-[#FF6B9D]/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HiStar size={24} className="text-[#FF6B9D] fill-[#FF6B9D]" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">You purchased this product!</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Share your experience and help other customers.</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#FF6B9D] text-white rounded-lg hover:bg-[#FF5A8A] transition font-semibold"
            >
              Write a Review
            </button>
          </div>
        </div>
      )}

      {/* Review Form */}
      {showForm && canReview && accessToken && (
        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Write Your Review</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="focus:outline-none"
                  >
                    <HiStar
                      size={32}
                      className={
                        star <= formData.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comment
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows="4"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent"
                placeholder="Share your experience with this product..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-[#FF6B9D] text-white rounded-lg hover:bg-[#FF5A8A] transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <HiStar size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{review.user}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(review.created_at)}</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <HiStar
                      key={star}
                      size={20}
                      className={
                        star <= review.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


