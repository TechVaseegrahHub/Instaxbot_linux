import React, { useState, useEffect, useRef } from 'react';
import { Plus, Save, Loader, Trash2, Edit, X } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

interface MediaItem {
  id: string;
  caption: string;
  media_type: string;
  media_url: string;
  timestamp: string;
  permalink: string;
  thumbnail_url?: string;
}

interface AutomationRule {
  ruleId?: string;
  mediaId: string;
  triggerText: string;
  replyText: string;
  ruleType: 'text' | 'template';
  templateItems?: Array<{
    image: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonUrl: string;
  }>;
  templateCount?: number;
}

interface StoryAutomationRule {
    ruleId?: string;
    triggerText: string;
    replyText: string;
    ruleType: 'text' | 'template';
    templateItems?: Array<{
      image: string;
      title: string;
      subtitle: string;
      buttonText: string;
      buttonUrl: string;
    }>;
    templateCount?: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Comments Automation Component (WITH PAGINATION)
const InstagramCommentAutomation: React.FC<{onClose: () => void}> = ({ onClose }) => {
  const formHeadingRef = useRef<HTMLHeadingElement>(null);

  // Media selector pagination states
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState<boolean>(false);
  const [mediaItemsPerPage] = useState<number>(12);
  const [mediaPaginationInfo, setMediaPaginationInfo] = useState<PaginationInfo | null>(null);
  
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      mediaId: '',
      triggerText: '',
      replyText: '',
      ruleType: 'text',
      templateCount: 1,
      templateItems: [{
        image: '',
        title: '',
        subtitle: '',
        buttonText: '',
        buttonUrl: ''
      }]
    }
  ]);
  const [existingRules, setExistingRules] = useState<AutomationRule[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState<boolean>(false);
  const [currentRuleIndex, setCurrentRuleIndex] = useState<number>(0);
  const [loadingRules, setLoadingRules] = useState<boolean>(true);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchExistingRules();
  }, []);

  const fetchExistingRules = async () => {
    setLoadingRules(true);
    try {
      const tenentId = localStorage.getItem('tenentid');
      const response = await axios.get(`/api/commentAutomationroute/rules?tenentId=${tenentId}`);
      if (response.data && response.data.success && Array.isArray(response.data.rules)) {
        const convertedRules = response.data.rules.map((rule: any) => {
          if (rule.ruleType === 'template') {
            return {
              ...rule,
              ruleType: 'template',
              templateItems: rule.carouselItems || [],
              templateCount: rule.carouselCount || 1
            };
          }
          return rule;
        });
        setExistingRules(convertedRules);
      } else {
        setExistingRules([]);
      }
    } catch (error) {
      console.error("Error fetching existing rules:", error);
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        setExistingRules([]);
      } else {
        setExistingRules([]);
        Swal.fire({
          icon: "error",
          title: "Failed to Load Rules",
          text: "Could not load your existing automation rules. Please try again later."
        });
      }
    } finally {
      setLoadingRules(false);
    }
  };

  const toggleShowRules = () => {
    setShowRules(prevState => !prevState);
  };

  const fetchInstagramMedia = async (
    tenentId: string | null, 
    page: number = 1, 
    limit: number = mediaItemsPerPage
  ) => {
    try {
      setLoadingMedia(true);
      
      const response = await axios.get(
        `/api/commentAutomationroute/media?tenentId=${tenentId}&page=${page}&limit=${limit}`
      );
      
      if (response.data && response.data.data) {
        setMediaItems(response.data.data);
        setMediaPaginationInfo(response.data.pagination);
        
        console.log("Pagination Info:", response.data.pagination);
      } else {
        Swal.fire({
          icon: "warning",
          title: "No Media Found",
          text: "No Instagram media found for your account."
        });
        setMediaItems([]);
        setMediaPaginationInfo(null);
      }
    } catch (err) {
      console.error("Error fetching Instagram media:", err);
      
      if (axios.isAxiosError(err) && err.response?.status === 404 && err.response?.data?.message === "Page not found") {
        Swal.fire({
          icon: "warning",
          title: "Page Not Found",
          text: "The requested page doesn't exist. Showing the first page instead."
        });
        if (page !== 1) {
          fetchInstagramMedia(tenentId, 1, limit);
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed to Load Media",
          text: "Could not load your Instagram media. Please try again later."
        });
        setMediaItems([]);
        setMediaPaginationInfo(null);
      }
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleMediaPageChange = (newPage: number) => {
    const tenentId = localStorage.getItem('tenentid');
    fetchInstagramMedia(tenentId, newPage, mediaItemsPerPage);
  };

  const MediaPaginationControls: React.FC<{
  paginationInfo: PaginationInfo | null;
  onPageChange: (page: number) => void;
}> = ({ paginationInfo, onPageChange }) => {
  if (!paginationInfo || paginationInfo.totalItems <= paginationInfo.itemsPerPage) return null;
  
  // Use mediaCurrentPage if you want to keep the variable
  const { totalPages, hasNextPage, hasPreviousPage } = paginationInfo;
  const currentPage = paginationInfo.currentPage; // This is from the API response
  
  return (
    <div className="pagination-controls flex items-center justify-center gap-4 mt-6">
      <button 
        disabled={!hasPreviousPage}
        onClick={() => onPageChange(currentPage - 1)}
        className="px-4 py-2 bg-pink-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-pink-700 transition-colors"
      >
        Previous
      </button>
      
      <span className="text-gray-700 font-medium">
        Page {currentPage} of {totalPages}
      </span>
      
      <button 
        disabled={!hasNextPage}
        onClick={() => onPageChange(currentPage + 1)}
        className="px-4 py-2 bg-pink-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-pink-700 transition-colors"
      >
        Next
      </button>
    </div>
  );
};
  const addAutomationRule = () => {
    setEditingRuleId(null);
    setAutomationRules([...automationRules, {
      mediaId: '',
      triggerText: '',
      replyText: '',
      ruleType: 'text',
      templateCount: 1,
      templateItems: [{
        image: '',
        title: '',
        subtitle: '',
        buttonText: '',
        buttonUrl: ''
      }]
    }]);
  };

  const removeAutomationRule = (index: number) => {
    if (automationRules.length > 1) {
      const newRules = automationRules.filter((_, i) => i !== index);
      setAutomationRules(newRules);
    }
  };

  const updateAutomationRule = (index: number, field: keyof AutomationRule, value: any) => {
    const newRules = [...automationRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setAutomationRules(newRules);
  };

  const selectMedia = (ruleIndex: number, mediaId: string) => {
    updateAutomationRule(ruleIndex, 'mediaId', mediaId);
    setShowMediaSelector(false);
    setSelectedMedia(null);
  };

  const openMediaSelector = (ruleIndex: number) => {
    setCurrentRuleIndex(ruleIndex);
    setSelectedMedia(automationRules[ruleIndex].mediaId);
    setShowMediaSelector(true);
    
    const tenentId = localStorage.getItem('tenentid');
    fetchInstagramMedia(tenentId, 1, mediaItemsPerPage);
  };

  const cancelMediaSelection = () => {
    setShowMediaSelector(false);
    setSelectedMedia(null);
  };

  const validateRules = () => {
    for (const rule of automationRules) {
      if (!rule.mediaId || !rule.triggerText) {
        Swal.fire({
          icon: "error",
          title: "Incomplete Information",
          text: "Please select an Instagram post and fill in the trigger text for each automation rule."
        });
        return false;
      }
      if (rule.ruleType === 'text' && !rule.replyText) {
        Swal.fire({
          icon: "error",
          title: "Incomplete Information",
          text: "Please provide a reply text for the text rule type."
        });
        return false;
      }
      if (rule.ruleType === 'template') {
        const items = rule.templateItems || [];
        if (items.length === 0) {
          Swal.fire({
            icon: "error",
            title: "Incomplete Information",
            text: "Template must have at least one item."
          });
          return false;
        }
        for (const item of items) {
          if (!item.image || !item.title) {
            Swal.fire({
              icon: "error",
              title: "Incomplete Information",
              text: "Each carousel item must have an image URL and a title."
            });
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRules()) {
      return;
    }

    try {
      const tenentId = localStorage.getItem('tenentid');
      if (editingRuleId) {
        await updateExistingRule(tenentId, editingRuleId, automationRules[0]);
      } else {
        await axios.post('/api/commentAutomationroute/comment-automation', { tenentId, automationRules });
      }
        
      Swal.fire({
        icon: "success",
        title: "Success",
        text: editingRuleId ? "Your automation rule has been updated successfully!" : "Comment automation rules saved successfully!",
        confirmButtonText: "OK",
        confirmButtonColor: "#007bff",
        customClass: {
          confirmButton: 'swal2-confirm-blue'
        }
      });
      
      setEditingRuleId(null);
      setAutomationRules([{
        mediaId: '',
        triggerText: '',
        replyText: '',
        ruleType: 'text',
        templateCount: 1,
        templateItems: [{ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' }]
      }]);

      await fetchExistingRules();
      setShowRules(true);

    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Failed to save automation rules. Please try again."
      });
    }
  };

  const updateExistingRule = async (tenentId: string | null, ruleId: string, rule: AutomationRule) => {
    try {
      await axios.put(`/api/commentAutomationroute/rule/${ruleId}`, {
        tenentId,
        mediaId: rule.mediaId,
        triggerText: rule.triggerText,
        replyText: rule.replyText,
        ruleType: rule.ruleType,
        carouselItems: rule.templateItems,
        carouselCount: rule.templateCount
      });
    } catch (error) {
      console.error("Error updating rule:", error);
      throw error;
    }
  };

  const deleteRule = async (ruleId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#007bff',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const tenentId = localStorage.getItem('tenentid');
        await axios.delete(`/api/commentAutomationroute/rule/${ruleId}?tenentId=${tenentId}`);
        setExistingRules(existingRules.filter(rule => rule.ruleId !== ruleId));
        if (editingRuleId === ruleId) cancelEditing();
        Swal.fire('Deleted!', 'Your automation rule has been deleted.', 'success');
      } catch (error) {
        console.error("Error deleting rule:", error);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: "Failed to delete the automation rule. Please try again."
        });
      }
    }
  };

  const editRule = (rule: AutomationRule) => {
    if (rule.ruleId) setEditingRuleId(rule.ruleId);

    const ruleForForm = { 
        ...rule,
        ruleType: rule.ruleType || 'text',
        templateCount: rule.templateCount || (rule as any).carouselCount || 1,
        templateItems: rule.templateItems || (rule as any).carouselItems || []
    };

    if (ruleForForm.ruleType === 'template' && ruleForForm.templateItems.length === 0) {
        ruleForForm.templateItems = [{ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' }];
        ruleForForm.templateCount = 1;
    }
    
    setAutomationRules([ruleForForm]);

    setTimeout(() => {
        formHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
    setAutomationRules([{
      mediaId: '',
      triggerText: '',
      replyText: '',
      ruleType: 'text',
      templateCount: 1,
      templateItems: [{ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' }]
    }]);
  };

  const getMediaThumbnail = (mediaId: string) => {
    const media = mediaItems.find(item => item.id === mediaId);
    if (!media) return 'https://via.placeholder.com/80?text=Loading...';
    return media.media_type === 'VIDEO' && media.thumbnail_url
      ? media.thumbnail_url
      : media.media_url;
  };

  const getMediaThumbnailFromItem = (item: MediaItem): string => {
    if (item.media_type === 'VIDEO' && item.thumbnail_url) {
      return item.thumbnail_url;
    }
    return item.media_url;
  };

  const getMediaCaption = (mediaId: string) => {
    const media = mediaItems.find(item => item.id === mediaId);
    return media ? (media.caption || 'No caption') : 'Loading Media...';
  };

  return (
    <div className="bg-gray-50 py-8 px-4">
      <style>{`
        .swal2-confirm-blue {
          background-color: #007bff !important;
          border: 1px solid #007bff !important;
        }
        .swal2-confirm-blue:hover {
          background-color: #0056b3 !important;
          border-color: #0056b3 !important;
        }
      `}</style>
      <div className="w-full max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-pink-100">
            <div className="flex justify-between items-center border-b border-pink-100 pb-4 mb-4">
              <h2 ref={formHeadingRef} className="text-2xl font-bold text-gray-800">
                {editingRuleId ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </h2>
              <div className="flex items-center gap-2">
                {editingRuleId && (
                  <button type="button" onClick={cancelEditing} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md">Cancel Editing</button>
                )}
                {!editingRuleId && (
                  <button type="button" onClick={addAutomationRule} className="flex items-center gap-2 px-3 py-1.5 bg-pink-600 text-white rounded-md text-base shadow-md hover:bg-pink-700 transition-all duration-300">
                    <Plus size={16} /> New Automation
                  </button>
                )}
                 <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Close"
                >
                    <X size={24} />
                </button>
              </div>
            </div>
            {automationRules.map((automationRule, index) => (
                <div key={index} className="mb-6 p-5 bg-white border border-pink-100 rounded-lg shadow-sm">
                    <div className="flex justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {editingRuleId ? 'Editing Rule' : `Rule ${index + 1}`}
                      </h3>
                      {!editingRuleId && automationRules.length > 1 && (
                        <button type="button" onClick={() => removeAutomationRule(index)} className="text-pink-600 hover:text-pink-800">Remove</button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="w-full">
                        <label className="block text-gray-700 mb-2">Select Instagram Post</label>
                        <button type="button" onClick={() => openMediaSelector(index)} className="w-full px-4 py-2 border border-gray-300 rounded-md text-left flex items-center justify-between hover:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500">
                          <span>
                            {automationRule.mediaId 
                                ? getMediaCaption(automationRule.mediaId).substring(0, 50) + (getMediaCaption(automationRule.mediaId).length > 50 ? '...' : '') 
                                : 'Click to select a post'}
                          </span>
                           {automationRule.mediaId && (
                                <img 
                                    src={getMediaThumbnail(automationRule.mediaId)} 
                                    alt="Selected Post Thumbnail" 
                                    className="w-8 h-8 object-cover rounded-sm ml-2" 
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32?text=No+Img'; }}
                                />
                            )}
                        </button>
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-2">When a comment contains:</label>
                        <input type="text" value={automationRule.triggerText} onChange={(e) => updateAutomationRule(index, 'triggerText', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="Enter trigger keywords or phrases"/>
                      </div>
                      <div className="w-full">
                        <label className="block text-gray-700 mb-2">Rule Type</label>
                        <select value={automationRule.ruleType} onChange={(e) => updateAutomationRule(index, 'ruleType', e.target.value as 'text' | 'template')} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                          <option value="text">Text Reply</option>
                          <option value="template">Carousel</option>
                        </select>
                      </div>
                      {automationRule.ruleType === 'text' && (
                        <div>
                          <label className="block text-gray-700 mb-2">Automatically reply with:</label>
                          <textarea value={automationRule.replyText} onChange={(e) => updateAutomationRule(index, 'replyText', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 h-24" placeholder="Enter your automated reply"/>
                        </div>
                      )}
                      {automationRule.ruleType === 'template' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-grow">
                              <label className="block text-gray-700 mb-2">Number of Carousel Items:</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={automationRule.templateCount || 1}
                                onChange={(e) => {
                                  const count = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
                                  const newRules = [...automationRules];
                                  const currentItems = newRules[index].templateItems || [];
                                  const newItems = [...currentItems];
                                  while (newItems.length < count) {
                                    newItems.push({ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' });
                                  }
                                  while (newItems.length > count) {
                                    newItems.pop();
                                  }
                                  newRules[index] = { ...newRules[index], templateCount: count, templateItems: newItems };
                                  setAutomationRules(newRules);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                              />
                            </div>
                            <div className="pt-8">
                              <button
                                type="button"
                                onClick={() => {
                                  const newRules = [...automationRules];
                                  const newItems = [...(newRules[index].templateItems || [])];
                                  if(newItems.length < 10) {
                                    newItems.push({ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' });
                                    const newCount = (newRules[index].templateCount || 1) + 1;
                                    newRules[index] = { ...newRules[index], templateItems: newItems, templateCount: newCount };
                                    setAutomationRules(newRules);
                                  } else {
                                    Swal.fire({
                                      icon: "warning",
                                      title: "Item Limit Reached",
                                      text: "You can add a maximum of 10 carousel items."
                                    });
                                  }
                                }}
                                className="px-3 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                              >
                                Add Item
                              </button>
                            </div>
                          </div>
                          
                          {(automationRule.templateItems || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="p-4 border border-gray-200 rounded-lg">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold">Carousel Item {itemIndex + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRules = [...automationRules];
                                    const newItems = (newRules[index].templateItems || []).filter((_, i) => i !== itemIndex);
                                    const newCount = Math.max(1, newItems.length);
                                    newRules[index] = { ...newRules[index], templateItems: newItems, templateCount: newCount };
                                    setAutomationRules(newRules);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-gray-700 mb-1">Image URL:</label>
                                  <input type="text" value={item.image} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], image: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter image URL"/>
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-1">Title:</label>
                                  <input type="text" value={item.title} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], title: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter title"/>
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-1">Subtitle:</label>
                                  <input type="text" value={item.subtitle} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], subtitle: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter subtitle"/>
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-1">Button Text:</label>
                                  <input type="text" value={item.buttonText} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], buttonText: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter button text"/>
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-1">Button URL:</label>
                                  <input type="text" value={item.buttonUrl} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], buttonUrl: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter button URL"/>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
              ))}
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border border-pink-100">
            <button type="submit" className="w-full px-4 py-2.5 bg-pink-600 text-white rounded-md font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm">
              <Save size={16} /> {editingRuleId ? 'Update Rule' : 'Save Automation Rules'}
            </button>
          </div>
        </form>
        <div className="mt-8 bg-white rounded-lg shadow-md p-6 border border-pink-100">
            <div className="flex justify-between items-center border-b border-pink-100 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Your Automation Rules</h2>
                <button type="button" onClick={toggleShowRules} className="text-pink-600 hover:text-pink-800">{showRules ? 'Hide Rules' : 'Show Rules'}</button>
            </div>
            {showRules && (
                loadingRules ? (
                    <div className="flex justify-center items-center py-10"><Loader className="animate-spin text-pink-600" size={32} /><span className="ml-2 text-gray-600">Loading your automation rules...</span></div>
                ) : (existingRules.length === 0) ? (
                    <div className="py-8 text-center"><p className="text-gray-500">No rules found. Create your first automation rule above!</p></div>
                ) : (
                    <div className="space-y-4">
                        {existingRules.map((rule) =>(
                            <div key={rule.ruleId} className={`p-4 border rounded-lg hover:border-pink-200 transition-all ${editingRuleId === rule.ruleId ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0"><img src={getMediaThumbnail(rule.mediaId)} alt="Post thumbnail" className="w-20 h-20 object-cover rounded-md" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=No+Image'; }}/></div>
                                    <div className="flex-grow">
                                        <p className="text-sm text-gray-500 mb-1">Trigger:</p><p className="text-md font-medium mb-2">"{rule.triggerText}"</p>
                                        <p className="text-sm text-gray-500 mb-1">Rule Type:</p><p className="text-md capitalize mb-2">{rule.ruleType === 'template' ? 'Carousel' : 'Text'}</p>
                                        {rule.ruleType === 'text' && (<><p className="text-sm text-gray-500 mb-1">Reply:</p><p className="text-md">{rule.replyText}</p></>)}
                                        {rule.ruleType === 'template' && (<><p className="text-sm text-gray-500 mb-1">Carousel:</p><p className="text-md">{rule.templateCount || (rule as any).carouselCount || 1} items</p></>)}
                                    </div>
                                    <div className="flex-shrink-0 flex gap-2">
                                        <button onClick={() => editRule(rule)} className={`p-2 hover:bg-blue-50 rounded-full ${editingRuleId === rule.ruleId ? 'text-blue-800 bg-blue-100' : 'text-blue-600'}`} title="Edit rule"><Edit size={18} /></button>
                                        <button onClick={() => rule.ruleId && deleteRule(rule.ruleId)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full" title="Delete rule"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
      </div>

      {/* Media Selector Modal with Pagination */}
      {showMediaSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Select Instagram Post</h3>
            
            {loadingMedia ? (
              <div className="flex justify-center items-center py-10">
                <Loader className="animate-spin text-pink-600" size={32} />
                <span className="ml-2 text-gray-600">Loading media...</span>
              </div>
            ) : mediaItems.length === 0 ? (
              <p className="text-gray-600 py-4">No media items found. Please reconnect your Instagram account.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaItems.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => selectMedia(currentRuleIndex, item.id)} 
                      className={`cursor-pointer border-2 rounded-lg overflow-hidden hover:border-pink-500 transition-all ${
                        selectedMedia === item.id ? 'border-pink-500 ring-2 ring-pink-300' : 'border-gray-200'
                      }`}
                    >
                      <div className="relative pb-[100%]">
                        <img 
                          src={getMediaThumbnailFromItem(item)} 
                          alt={item.caption || 'Instagram post'} 
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image'; }}
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-sm text-gray-800 line-clamp-2">{item.caption || 'No caption'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination Controls for Media Selector */}
                <MediaPaginationControls 
                  paginationInfo={mediaPaginationInfo} 
                  onPageChange={handleMediaPageChange}
                />
              </>
            )}
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={cancelMediaSelection} 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Story Comment Automation Component (NO PAGINATION - simplified)
const StoryCommentAutomation: React.FC<{onClose: () => void}> = ({ onClose }) => {
  const formHeadingRef = useRef<HTMLHeadingElement>(null);

  const [automationRules, setAutomationRules] = useState<StoryAutomationRule[]>([
    {
      triggerText: '',
      replyText: '',
      ruleType: 'text',
      templateCount: 1,
      templateItems: [{
        image: '',
        title: '',
        subtitle: '',
        buttonText: '',
        buttonUrl: ''
      }]
    }
  ]);
  const [existingRules, setExistingRules] = useState<StoryAutomationRule[]>([]);
  const [loadingRules, setLoadingRules] = useState<boolean>(true);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchExistingRules();
  }, []);

  const fetchExistingRules = async () => {
    setLoadingRules(true);
    try {
      const tenentId = localStorage.getItem('tenentid');
      const response = await axios.get(`/api/storycommentsAutomationroute/rules?tenentId=${tenentId}`);
      if (response.data && response.data.success && Array.isArray(response.data.rules)) {
        const convertedRules = response.data.rules.map((rule: any) => {
          if (rule.ruleType === 'carousel') {
            return {
              ...rule,
              ruleType: 'template',
              templateItems: rule.carouselItems || [],
              templateCount: rule.carouselCount || 1
            };
          }
          return rule;
        });
        setExistingRules(convertedRules);
      } else {
        setExistingRules([]);
      }
    } catch (error) {
      console.error("Error fetching existing rules:", error);
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        setExistingRules([]);
      } else {
        setExistingRules([]);
        Swal.fire({
          icon: "error",
          title: "Failed to Load Rules",
          text: "Could not load your existing automation rules. Please try again later."
        });
      }
    } finally {
      setLoadingRules(false);
    }
  };

  const toggleShowRules = () => {
    setShowRules(prevState => !prevState);
  };

  const addAutomationRule = () => {
    setEditingRuleId(null);
    setAutomationRules([...automationRules, {
      triggerText: '',
      replyText: '',
      ruleType: 'text',
      templateCount: 1,
      templateItems: [{
        image: '',
        title: '',
        subtitle: '',
        buttonText: '',
        buttonUrl: ''
      }]
    }]);
  };

  const removeAutomationRule = (index: number) => {
    if (automationRules.length > 1) {
      const newRules = automationRules.filter((_, i) => i !== index);
      setAutomationRules(newRules);
    }
  };

  const updateAutomationRule = (index: number, field: keyof StoryAutomationRule, value: any) => {
    const newRules = [...automationRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setAutomationRules(newRules);
  };

  const validateRules = () => {
    for (const rule of automationRules) {
      if (!rule.triggerText) return false;
      if (rule.ruleType === 'text' && !rule.replyText) return false;
      if (rule.ruleType === 'template') {
        const items = rule.templateItems || [];
        if (items.length === 0) return false;
        for (const item of items) {
          if (!item.image || !item.title) return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRules()) {
      Swal.fire({
        icon: "error",
        title: "Incomplete Information",
        text: "Please fill in all required fields for each automation rule."
      });
      return;
    }

    try {
      const tenentId = localStorage.getItem('tenentid');
      if (editingRuleId) {
        await updateExistingRule(tenentId, editingRuleId, automationRules[0]);
      } else {
        await axios.post('/api/storycommentsAutomationroute/comment-automation', { tenentId, automationRules });
      }
        
      Swal.fire({
        icon: "success",
        title: "Success",
        text: editingRuleId ? "Your story automation rule has been updated successfully!" : "Story comment automation rules saved successfully!",
        confirmButtonText: "OK",
        confirmButtonColor: "#007bff",
        customClass: {
          confirmButton: 'swal2-confirm-blue'
        }
      });
      
      setEditingRuleId(null);
      setAutomationRules([{
        triggerText: '',
        replyText: '',
        ruleType: 'text',
        templateCount: 1,
        templateItems: [{ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' }]
      }]);

      await fetchExistingRules();
      setShowRules(true);

    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Failed to save story automation rules. Please try again."
      });
    }
  };

  const updateExistingRule = async (tenentId: string | null, ruleId: string, rule: StoryAutomationRule) => {
    try {
      await axios.put(`/api/storycommentsAutomationroute/rule/${ruleId}`, {
        tenentId,
        triggerText: rule.triggerText,
        replyText: rule.replyText,
        ruleType: rule.ruleType,
        templateItems: rule.templateItems,
        templateCount: rule.templateCount
      });
    } catch (error) {
      console.error("Error updating rule:", error);
      throw error;
    }
  };

  const deleteRule = async (ruleId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#007bff',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const tenentId = localStorage.getItem('tenentid');
        await axios.delete(`/api/storycommentsAutomationroute/rule/${ruleId}?tenentId=${tenentId}`);
        setExistingRules(existingRules.filter(rule => rule.ruleId !== ruleId));
        if (editingRuleId === ruleId) cancelEditing();
        Swal.fire('Deleted!', 'Your story automation rule has been deleted.', 'success');
      } catch (error) {
        console.error("Error deleting rule:", error);
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: "Failed to delete the story automation rule. Please try again."
        });
      }
    }
  };

  const editRule = (rule: StoryAutomationRule) => {
    if (rule.ruleId) setEditingRuleId(rule.ruleId);
    setAutomationRules([{
      ...rule,
      ruleType: rule.ruleType || 'text',
      templateCount: rule.templateCount || (rule as any).carouselCount || 1,
      templateItems: rule.templateItems || (rule as any).carouselItems || [{ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' }]
    }]);

    setTimeout(() => {
      formHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
    setAutomationRules([{
      triggerText: '',
      replyText: '',
      ruleType: 'text',
      templateCount: 1,
      templateItems: [{ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' }]
    }]);
  };

  return (
    <div className="bg-gray-50 py-8 px-4">
      <style>{`
        .swal2-confirm-blue {
          background-color: #007bff !important;
          border: 1px solid #007bff !important;
        }
        .swal2-confirm-blue:hover {
          background-color: #0056b3 !important;
          border-color: #0056b3 !important;
        }
      `}</style>
      <div className="w-full max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-pink-100">
            <div className="flex justify-between items-center border-b border-pink-100 pb-4 mb-4">
              <h2 ref={formHeadingRef} className="text-2xl font-bold text-gray-800">
                {editingRuleId ? 'Edit Story Automation Rule' : 'Create Story Automation Rule'}
              </h2>
              <div className="flex items-center gap-2">
                {editingRuleId && (
                  <button type="button" onClick={cancelEditing} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md">Cancel Editing</button>
                )}
                {!editingRuleId && (
                  <button type="button" onClick={addAutomationRule} className="flex items-center gap-2 px-3 py-1.5 bg-pink-600 text-white rounded-md text-base shadow-md hover:bg-pink-700 transition-all duration-300">
                    <Plus size={16} /> New Story Automation
                  </button>
                )}
                 <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Close"
                >
                    <X size={24} />
                </button>
              </div>
            </div>
            {automationRules.map((automationRule, index) => (
                <div key={index} className="mb-6 p-5 bg-white border border-pink-100 rounded-lg shadow-sm">
                   <div className="flex justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {editingRuleId ? 'Editing Rule' : `Rule ${index + 1}`}
                      </h3>
                      {!editingRuleId && automationRules.length > 1 && (
                        <button type="button" onClick={() => removeAutomationRule(index)} className="text-pink-600 hover:text-pink-800">Remove</button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-700 mb-2">When a story reply contains:</label>
                        <input type="text" value={automationRule.triggerText} onChange={(e) => updateAutomationRule(index, 'triggerText', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="Enter trigger keywords or phrases"/>
                      </div>
                      <div className="w-full">
                        <label className="block text-gray-700 mb-2">Rule Type</label>
                        <select value={automationRule.ruleType} onChange={(e) => updateAutomationRule(index, 'ruleType', e.target.value as 'text' | 'template')} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500">
                          <option value="text">Text Reply</option>
                          <option value="template">Carousel</option>
                        </select>
                      </div>
                      {automationRule.ruleType === 'text' && (
                        <div>
                          <label className="block text-gray-700 mb-2">Automatically reply with:</label>
                          <textarea value={automationRule.replyText} onChange={(e) => updateAutomationRule(index, 'replyText', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 h-24" placeholder="Enter your automated reply"/>
                        </div>
                      )}
                      {automationRule.ruleType === 'template' && (
                         <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-grow">
                              <label className="block text-gray-700 mb-2">Number of Carousel Items:</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={automationRule.templateCount || 1}
                                onChange={(e) => {
                                  const count = Math.max(1, parseInt(e.target.value) || 1);
                                  const newRules = [...automationRules];
                                  const currentItems = newRules[index].templateItems || [];
                                  const newItems = [...currentItems];
                                  while (newItems.length < count) {
                                    newItems.push({ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' });
                                  }
                                  while (newItems.length > count) {
                                    newItems.pop();
                                  }
                                  newRules[index] = { ...newRules[index], templateCount: count, templateItems: newItems };
                                  setAutomationRules(newRules);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                              />
                            </div>
                            <div className="pt-8">
                              <button
                                type="button"
                                onClick={() => {
                                  const newRules = [...automationRules];
                                  const newItems = [...(newRules[index].templateItems || [])];
                                  if(newItems.length < 10) {
                                    newItems.push({ image: '', title: '', subtitle: '', buttonText: '', buttonUrl: '' });
                                    const newCount = (newRules[index].templateCount || 1) + 1;
                                    newRules[index] = { ...newRules[index], templateItems: newItems, templateCount: newCount };
                                    setAutomationRules(newRules);
                                  }
                                }}
                                className="px-3 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                              >
                                Add Item
                              </button>
                            </div>
                          </div>
                          
                          {(automationRule.templateItems || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="p-4 border border-gray-200 rounded-lg">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold">Carousel Item {itemIndex + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRules = [...automationRules];
                                    const newItems = (newRules[index].templateItems || []).filter((_, i) => i !== itemIndex);
                                    const newCount = Math.max(1, newItems.length);
                                    newRules[index] = { ...newRules[index], templateItems: newItems, templateCount: newCount };
                                    setAutomationRules(newRules);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-gray-700 mb-1">Image URL:</label>
                                  <input type="text" value={item.image} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], image: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter image URL"/>
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-1">Title:</label>
                                  <input type="text" value={item.title} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], title: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter title"/>
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-1">Subtitle:</label>
                                  <input type="text" value={item.subtitle} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], subtitle: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter subtitle"/>
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-1">Button Text:</label>
                                  <input type="text" value={item.buttonText} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], buttonText: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter button text"/>
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-1">Button URL:</label>
                                  <input type="text" value={item.buttonUrl} onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], buttonUrl: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                  }} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Enter button URL"/>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
              ))}
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border border-pink-100">
            <button type="submit" className="w-full px-4 py-2.5 bg-pink-600 text-white rounded-md font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm">
              <Save size={16} /> {editingRuleId ? 'Update Rule' : 'Save Story Automation Rules'}
            </button>
          </div>
        </form>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6 border border-pink-100">
            <div className="flex justify-between items-center border-b border-pink-100 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Your Story Automation Rules</h2>
                <button type="button" onClick={toggleShowRules} className="text-pink-600 hover:text-pink-800">{showRules ? 'Hide Rules' : 'Show Rules'}</button>
            </div>
            {showRules && (
                loadingRules ? (
                    <div className="flex justify-center items-center py-10"><Loader className="animate-spin text-pink-600" size={32} /><span className="ml-2 text-gray-600">Loading your automation rules...</span></div>
                ) : (existingRules.length === 0) ? (
                    <div className="py-8 text-center"><p className="text-gray-500">No rules found. Create your first automation rule above!</p></div>
                ) : (
                    <div className="space-y-4">
                        {existingRules.map((rule) =>(
                            <div key={rule.ruleId} className={`p-4 border rounded-lg hover:border-pink-200 transition-all ${editingRuleId === rule.ruleId ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                                <div className="flex items-start gap-4">
                                    {/* Thumbnail image removed */}
                                    <div className="flex-grow">
                                        <p className="text-sm text-gray-500 mb-1">Trigger:</p><p className="text-md font-medium mb-2">"{rule.triggerText}"</p>
                                        <p className="text-sm text-gray-500 mb-1">Rule Type:</p><p className="text-md capitalize mb-2">{rule.ruleType === 'template' ? 'Carousel' : 'Text'}</p>
                                        {rule.ruleType === 'text' && (<><p className="text-sm text-gray-500 mb-1">Reply:</p><p className="text-md">{rule.replyText}</p></>)}
                                        {rule.ruleType === 'template' && (<><p className="text-sm text-gray-500 mb-1">Carousel:</p><p className="text-md">{rule.templateCount || (rule as any).carouselCount || 1} items</p></>)}
                                    </div>
                                    <div className="flex-shrink-0 flex gap-2">
                                        <button onClick={() => editRule(rule)} className={`p-2 hover:bg-blue-50 rounded-full ${editingRuleId === rule.ruleId ? 'text-blue-800 bg-blue-100' : 'text-blue-600'}`} title="Edit rule"><Edit size={18} /></button>
                                        <button onClick={() => rule.ruleId && deleteRule(rule.ruleId)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full" title="Delete rule"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
      </div>
      {/* Media Selector modal removed */}
    </div>
  );
};


//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// 3. MAIN DASHBOARD COMPONENT (Updated with Pop-Box Logic for both)
// This component now shows both automation forms inline conditionally.
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const AllCommentsAutomation: React.FC = () => {
  // State to manage the visibility of the comments automation form
  const [isFormVisible, setIsFormVisible] = useState(false);
  // State to manage the visibility of the story comments automation form
  const [isStoryFormVisible, setIsStoryFormVisible] = useState(false);

  // Function to toggle the comments form's visibility
  const toggleFormVisibility = () => {
    setIsFormVisible(prev => !prev);
    if (!isFormVisible) {
      setIsStoryFormVisible(false); // Close story form if opening comments form
    }
  };

  // Function to toggle the story form's visibility
  const toggleStoryFormVisibility = () => {
    setIsStoryFormVisible(prev => !prev);
    if (!isStoryFormVisible) {
      setIsFormVisible(false); // Close comments form if opening story form
    }
  };


  return (
    <>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-800 text-center">Automation Dashboard</h1>
          </div>

          {/* Side by Side Layout for Buttons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left Side - Comments Automation Button Container */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <button
                onClick={toggleFormVisibility}
                className={`w-full py-3 px-6 border-2 rounded-lg transition-colors duration-200 font-medium ${
                  isFormVisible
                    ? 'bg-pink-500 border-pink-600 text-white'
                    : 'border-pink-300 text-gray-800 hover:bg-pink-500 hover:border-pink-600 hover:text-white'
                }`}
              >
                {isFormVisible ? 'Close Automation Setup' : 'Comments Automation'}
              </button>
            </div>

            {/* Right Side - Store Comments Automation */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <button
                onClick={toggleStoryFormVisibility}
                className={`w-full py-3 px-6 border-2 rounded-lg transition-colors duration-200 font-medium ${
                  isStoryFormVisible
                    ? 'bg-pink-500 border-pink-600 text-white'
                    : 'border-pink-300 text-gray-800 hover:bg-pink-500 hover:border-pink-600 hover:text-white'
                }`}
              >
                {isStoryFormVisible ? 'Close Story Automation Setup' : 'Story Comments Automation'}
              </button>
            </div>
          </div>

          {/* The "Pop-Box" for Comments Automation, rendered conditionally below buttons */}
          {isFormVisible && (
            <div className="mt-6">
              <InstagramCommentAutomation onClose={() => setIsFormVisible(false)} />
            </div>
          )}

          {/* The "Pop-Box" for Story Comments Automation, rendered conditionally below buttons */}
          {isStoryFormVisible && (
            <div className="mt-6">
              <StoryCommentAutomation onClose={() => setIsStoryFormVisible(false)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
export default AllCommentsAutomation;
