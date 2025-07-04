import { useState, useEffect } from 'react';
import { Search, MessageSquare, ArrowLeft } from 'lucide-react';

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import axios from 'axios';

// Define types for our data
interface MediaItem {
  id: string;
  caption?: string;
  displayUrl?: string;
  timestamp: string;
  commentCount: number;
  media_type: string;
}

interface Comment {
  mediaId: string;
  username?: string;
  senderId?: string;
  message: string;
  response?: string;
  Timestamp: string;
}

export default function MediaComments() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  // Mobile view state
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [showMediaList, setShowMediaList] = useState<boolean>(true);

  useEffect(() => {
    fetchMediaWithComments();
    
    // Set up mobile detection
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch media with comments
  const fetchMediaWithComments = async () => {
    setLoading(true);
    try {
      const tenentId = localStorage.getItem('tenentid');
      if (!tenentId) {
        console.error("No tenant ID found in localStorage");
        setLoading(false);
        return;
      }

      const response = await axios.get(`/api/commentAutomationroute/comments-by-media?tenentId=${tenentId}`);
      
      if (response.data.success) {
        setMediaItems(response.data.data);
      } else {
        console.error("Failed to fetch media with comments:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching media with comments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch comments for selected media
  const fetchCommentsForMedia = async (mediaId: string) => {
    // Clear previous comments and set loading state
    setComments([]);
    setCommentsLoading(true);
    
    try {
      const tenentId = localStorage.getItem('tenentid');
      if (!tenentId) {
        console.error("No tenant ID found in localStorage");
        setCommentsLoading(false);
        return;
      }

      console.log(`Fetching comments for media ID: ${mediaId}`);
      const response = await axios.get(`/api/commentAutomationroute/media-comments/${mediaId}?tenentId=${tenentId}`);
      
      if (response.data.success) {
        console.log(`Received ${response.data.comments.length} comments for media ID: ${mediaId}`);
        
        // Ensure comments belong to the selected media
        const validComments = response.data.comments.filter(
          (comment: Comment) => comment.mediaId === mediaId
        );
        
        console.log(`After filtering, ${validComments.length} valid comments remain`);
        setComments(validComments);
      } else {
        console.error("Failed to fetch comments for media:", response.data.message);
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments for media:", error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Handle media selection - modified for mobile view
  const handleMediaSelect = (media: MediaItem) => {
    console.log(`Selected media with ID: ${media.id}`);
    setSelectedMedia(media);
    
    // On mobile, switch to comments view
    if (isMobileView) {
      setShowMediaList(false);
    }
    
    fetchCommentsForMedia(media.id);
  };
  
  // Handle back button for mobile
  const handleBackToMediaList = () => {
    setShowMediaList(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Filter media based on search query
  const filteredMedia = mediaItems.filter(media => {
    const caption = media.caption?.toLowerCase() || '';
    return caption.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-[91vh] overflow-hidden">
      {/* Media Sidebar - conditionally shown on mobile */}
      {(!isMobileView || (isMobileView && showMediaList)) && (
        <div className={`${isMobileView ? 'w-full' : 'w-1/3'} border-r bg-white p-4 flex flex-col overflow-hidden`}>
          <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Media Posts</h2>
          
          {/* Search Bar */}
          <div className="mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search by caption..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2"
              />
            </div>
          </div>
          
          {/* Media List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <p className="text-gray-500 text-center p-4">
                No media found
              </p>
            ) : (
              filteredMedia.map(media => (
                <div
                  key={media.id}
                  onClick={() => handleMediaSelect(media)}
                  className={`flex items-start p-3 mb-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                    selectedMedia?.id === media.id ? 'bg-gray-100' : ''
                  }`}
                >
                  {/* Media Thumbnail */}
                  <div className="w-20 h-20 flex-shrink-0 mr-3 rounded-md overflow-hidden bg-gray-200">
                    {media.displayUrl ? (
                      <img
                        src={media.displayUrl}
                        alt="Media thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/80?text=No+Image";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    {/* Caption */}
                    <div className="text-sm line-clamp-2 mb-1">
                      {media.caption || "No caption"}
                    </div>
                    
                    {/* Date & Comment Count */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {formatDate(media.timestamp)}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span>{media.commentCount} comments</span>
                      </div>
                    </div>
                    
                    {/* Media Type */}
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        media.media_type === 'VIDEO' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {media.media_type}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Comments Area - conditionally shown on mobile */}
      {(!isMobileView || (isMobileView && !showMediaList)) && (
        <div className={`${isMobileView ? 'w-full' : 'flex-1'} flex flex-col overflow-hidden`}>
          {selectedMedia ? (
            <>
              {/* Selected Media Header - Modified for mobile */}
              <div className="flex-shrink-0 p-4 border-b bg-white">
                <div className="flex items-start">
                  {/* Back button for mobile */}
                  {isMobileView && (
                    <button 
                      onClick={handleBackToMediaList}
                      className="mr-2 text-gray-600 hover:text-gray-900 mt-1"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                
                  <div className="w-16 h-16 flex-shrink-0 mr-3 rounded-md overflow-hidden bg-gray-200">
                    <img
                      src={selectedMedia.displayUrl}
                      alt="Media"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/80?text=No+Image";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium mb-1 truncate">
                      {selectedMedia.media_type} • {formatDate(selectedMedia.timestamp)}
                    </h3>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">{selectedMedia.caption || "No caption"}</p>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="text-sm font-medium">{selectedMedia.commentCount} comments</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="flex-1 bg-gray-50 overflow-y-auto p-3">
                {commentsLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No comments on this post
                  </div>
                ) : (
                  comments.map((comment, index) => (
                    <Card key={`${comment.mediaId}-${index}`} className="mb-2 shadow-sm">
                      <CardContent className="p-2.5">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="font-medium text-sm truncate">{comment.username || comment.senderId}</div>
                          <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDate(comment.Timestamp)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-1.5 break-words">{comment.message}</p>
                        
                        {comment.response && (
                          <div className="bg-blue-50 py-1.5 px-2 rounded border-l-2 border-blue-400 mt-1">
                            <div className="text-xs text-gray-500">Reply:</div>
                            <p className="text-xs text-gray-700 break-words">{comment.response}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              {isMobileView ? (
                <button
                  onClick={handleBackToMediaList}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Media List
                </button>
              ) : (
                "Select a media post to view comments"
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}