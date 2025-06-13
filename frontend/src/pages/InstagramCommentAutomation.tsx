import { useState, useEffect, useRef } from 'react';
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
}

interface AutomationRule {
  ruleId?: string;
  mediaId: string;
  triggerText: string;
  replyText: string;
  ruleType: 'text' | 'template';
  // Template fields (now used for carousel functionality)
  templateItems?: Array<{
    image: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonUrl: string;
  }>;
  templateCount?: number;
}

const InstagramCommentAutomation: React.FC = () => {
  // Add this ref to target the form heading
  const formHeadingRef = useRef<HTMLHeadingElement>(null);
  
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
  // Add a state to track if we're editing an existing rule
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  // Mobile view state
  const [isMobileView, setIsMobileView] = useState<boolean>(false);

  useEffect(() => {
    fetchMediaItems();
    fetchExistingRules();
    
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

  const fetchMediaItems = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would get the access token from your auth system
      const tenentId = localStorage.getItem('tenentid');
      
      // Check if we have a valid Instagram token
      const tokenResponse = await axios.get(`/api/commentAutomationroute/check-token?tenentId=${tenentId}`);
      if (!tokenResponse.data.valid) {
        // Sweet message when token is not valid
        console.log("Oops! Your Instagram connection needs a refresh. Let's get you reconnected!");
        // You might also want to add UI code here to display the message to the user
      } else {
        // We already have a valid token, fetch media
        fetchInstagramMedia(tenentId);
      }
    } catch (error) {
      console.error("Error fetching media items:", error);
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Media",
        text: "Could not load your Instagram media. Please try again later."
      });
    }
  };

  const fetchExistingRules = async () => {
    setLoadingRules(true);
    try {
      const tenentId = localStorage.getItem('tenentid');
      const response = await axios.get(`/api/commentAutomationroute/rules?tenentId=${tenentId}`);
      
      // If the request was successful, set the rules
      if (response.data && response.data.success && Array.isArray(response.data.rules)) {
        // Convert any carousel rules to template format
        // For the first error, add type annotation to the map function parameter:
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
      
      // Type guard for axios error
      if (axios.isAxiosError(error) && error.response && error.response.status === 404) {
        // This is just "no rules found," not an error
        setExistingRules([]);
      } else {
        // This is an actual error
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
    setShowRules(prevState => !prevState); // Toggle the visibility of the rules section
  };

  const fetchInstagramMedia = async (tenentId: string | null) => {
    try {
      const response = await axios.get(`/api/commentAutomationroute/media?tenentId=${tenentId}`);

      if (response.data && response.data.data) {
        setMediaItems(response.data.data);
      } else {
        Swal.fire({
          icon: "warning",
          title: "No Media Found",
          text: "No Instagram media found for your account."
        });
      }
    } catch (error) {
      console.error("Error fetching Instagram media:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Media",
        text: "Could not load your Instagram media. Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  const addAutomationRule = () => {
    // Clear editing state if adding a new rule
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

  const updateAutomationRule = (index: number, field: keyof AutomationRule, value: string) => {
    const newRules = [...automationRules];
    newRules[index] = { ...newRules[index], [field]: value };
    setAutomationRules(newRules);
  };

  const selectMedia = (ruleIndex: number, mediaId: string) => {
    const newRules = [...automationRules];
    newRules[ruleIndex].mediaId = mediaId;
    setAutomationRules(newRules);
    setShowMediaSelector(false);
    setSelectedMedia(null);
  };
  
  const openMediaSelector = (ruleIndex: number) => {
    setCurrentRuleIndex(ruleIndex);
    setSelectedMedia(automationRules[ruleIndex].mediaId);
    setShowMediaSelector(true);
  };
  
  const cancelMediaSelection = () => {
    setShowMediaSelector(false);
    setSelectedMedia(null);
    // No changes to the rules when canceling
  };

  // Validate fields based on rule type
  const validateRules = () => {
    for (const rule of automationRules) {
      if (!rule.mediaId || !rule.triggerText) {
        return false;
      }
      
      if (rule.ruleType === 'text' && !rule.replyText) {
        return false;
      }
      
      if (rule.ruleType === 'template') {
        const items = rule.templateItems || [];
        if (items.length === 0) return false;
        
        for (const item of items) {
          if (!item.image || !item.title) {
            return false;
          }
        }
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate fields
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
      
      // If we're editing an existing rule
      if (editingRuleId) {
        await updateExistingRule(tenentId, editingRuleId, automationRules[0]);
      } else {
        // Otherwise create new rules
        const response = await axios.post(
          '/api/commentAutomationroute/comment-automation',
          {
            tenentId,
            automationRules
          }
        );

        if (response.data) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: "Comment automation rules saved successfully!"
          });
        }
      }
      
      // Reset form and editing state
      setEditingRuleId(null);
      setAutomationRules([{ 
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
      
      // Refresh existing rules
      fetchExistingRules();
      
      // Show rules after successful save
      setShowRules(true);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Failed to save automation rules. Please try again."
      });
    }
  };
  
  // New function to handle updating an existing rule
  const updateExistingRule = async (tenentId: string | null, ruleId: string, rule: AutomationRule) => {
    try {
      const response = await axios.put(
        `/api/commentAutomationroute/rule/${ruleId}`,
        {
          tenentId,
          mediaId: rule.mediaId,
          triggerText: rule.triggerText,
          replyText: rule.replyText,
          ruleType: rule.ruleType,
          // Send template items as carousel items for backend compatibility
          carouselItems: rule.templateItems,
          carouselCount: rule.templateCount
        }
      );
      
      if (response.data && response.data.success) {
        // Update the existing rules list with the updated rule
        const updatedRule = response.data.rule;
        setExistingRules(existingRules.map(r => 
          r.ruleId === ruleId ? updatedRule : r
        ));
        
        Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Your automation rule has been updated successfully!"
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating rule:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update the automation rule. Please try again."
      });
      return false;
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
        const tenentId = localStorage.getItem('tenentid');
        await axios.delete(`/api/commentAutomationroute/rule/${ruleId}?tenentId=${tenentId}`);
        
        // Update the UI
        setExistingRules(existingRules.filter(rule => rule.ruleId !== ruleId));
        
        // Clear editing state if the rule being edited is deleted
        if (editingRuleId === ruleId) {
          setEditingRuleId(null);
          setAutomationRules([{ 
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
        }
        
        Swal.fire(
          'Deleted!',
          'Your automation rule has been deleted.',
          'success'
        );
      }
    } catch (error) {
      console.error("Error deleting rule:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: "Failed to delete the automation rule. Please try again."
      });
    }
  };

  const editRule = (rule: AutomationRule) => {
    // Set the editing state to the ruleId
    if (rule.ruleId) {
      setEditingRuleId(rule.ruleId);
    }
    
    // Load the rule into the form - convert carousel data to template if needed
    setAutomationRules([{ 
      mediaId: rule.mediaId,
      triggerText: rule.triggerText,
      replyText: rule.replyText,
      ruleType: rule.ruleType || 'text',
      templateCount: rule.templateCount || (rule as any).carouselCount || 1,
      templateItems: rule.templateItems || (rule as any).carouselItems || [{ 
        image: '', 
        title: '', 
        subtitle: '', 
        buttonText: '', 
        buttonUrl: '' 
      }]
    }]);
    
    // Scroll to the form heading with a slight delay to ensure state updates
    setTimeout(() => {
      if (formHeadingRef.current) {
        formHeadingRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };
  
  // Function to cancel editing
  const cancelEditing = () => {
    setEditingRuleId(null);
    setAutomationRules([{ 
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

  const getMediaThumbnail = (mediaId: string) => {
    const media = mediaItems.find(item => item.id === mediaId);
    if (!media) return '';
    
    // Use thumbnail_url for videos if available
    return media.media_type === 'VIDEO' && (media as any).thumbnail_url
      ? (media as any).thumbnail_url
      : media.media_url;
  };

  const getMediaThumbnailFromItem = (item: MediaItem): string => {
    if (item.media_type === 'VIDEO' && (item as any).thumbnail_url) {
      return (item as any).thumbnail_url;
    }
    return item.media_url;
  };
  
  const getMediaCaption = (mediaId: string) => {
    const media = mediaItems.find(item => item.id === mediaId);
    return media ? (media.caption || 'No caption') : '';
  };

  return (
    <div className="min-h-screen bg-gray-100 py-4 sm:py-8 px-2 sm:px-4">
      <div className="w-full max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-pink-100">
            <div className="flex justify-between items-center border-b border-pink-100 pb-3 sm:pb-4 mb-3 sm:mb-4">
              <h2 
                ref={formHeadingRef}
                className="text-xl sm:text-2xl font-bold text-gray-800"
              >
                {editingRuleId ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </h2>
              <div className="flex items-center gap-1 sm:gap-2">
                {editingRuleId && (
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-md"
                  >
                    Cancel
                  </button>
                )}
                {!editingRuleId && (
                  <button
                    type="button"
                    onClick={addAutomationRule}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-pink-600 text-white rounded-md text-xs sm:text-base shadow-md hover:bg-pink-700 transition-all duration-300"
                  >
                    <Plus size={isMobileView ? 14 : 16} />
                    {isMobileView ? 'New' : 'New Automation'}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-6 sm:py-10">
                <Loader className="animate-spin text-pink-600" size={isMobileView ? 24 : 32} />
                <span className="ml-2 text-sm sm:text-base text-gray-600">Loading your Instagram media...</span>
              </div>
            ) : (
              <>
                {automationRules.map((automationRule, index) => (
                  <div key={index} className="mb-4 sm:mb-6 p-3 sm:p-5 bg-white border border-pink-100 rounded-lg shadow-sm">
                    <div className="flex justify-between mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                        {editingRuleId ? 'Editing Rule' : `Rule ${index + 1}`}
                      </h3>
                      {!editingRuleId && automationRules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAutomationRule(index)}
                          className="text-pink-600 hover:text-pink-800"
                        >
                          <Trash2 size={isMobileView ? 16 : 18} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div className="w-full">
                        <label className="block text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">Select Instagram Post</label>
                        <button
                          type="button"
                          onClick={() => openMediaSelector(index)}
                          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-md text-left text-sm flex items-center justify-between hover:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        >
                          <span className="truncate">
                            {automationRule.mediaId 
                              ? getMediaCaption(automationRule.mediaId).substring(0, isMobileView ? 30 : 50) + (getMediaCaption(automationRule.mediaId).length > (isMobileView ? 30 : 50) ? '...' : '')
                              : 'Click to select a post'}
                          </span>
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">When a comment contains:</label>
                        <input
                          type="text"
                          value={automationRule.triggerText}
                          onChange={(e) => updateAutomationRule(index, 'triggerText', e.target.value)}
                          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                          placeholder="Enter trigger keywords or phrases"
                        />
                      </div>
                      
                    {/* Fix for text reply button overflow in sidebar */}
                    <div className="w-full">
                      <label className="block text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">Rule Type</label>
                      <div className="relative">
                        <select
                          value={automationRule.ruleType}
                          onChange={(e) => updateAutomationRule(index, 'ruleType', e.target.value as 'text' | 'template')}
                          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white appearance-none truncate"
                        >
                          <option value="text">Text Reply</option>
                          <option value="template">Carousel</option>
                        </select>
                        {/* Dropdown arrow indicator */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {automationRule.ruleType === 'text' && (
                      <div className="mt-3">
                        <label className="block text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">Automatically reply with:</label>
                        <textarea
                          value={automationRule.replyText}
                          onChange={(e) => updateAutomationRule(index, 'replyText', e.target.value)}
                          className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 h-20 sm:h-24 resize-none"
                          placeholder="Enter your automated reply"
                        />
                      </div>
                    )}

                      {automationRule.ruleType === 'template' && (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-2 sm:gap-4">
                            <div className="flex-grow">
                              <label className="block text-sm sm:text-base text-gray-700 mb-1 sm:mb-2">Number of Carousel Items:</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={automationRule.templateCount || 1}
                                onChange={(e) => {
                                  // Update the count
                                  const count = parseInt(e.target.value) || 1;
                                  updateAutomationRule(index, 'templateCount', count.toString());
                                  
                                  // Initialize or update template items array based on the new count
                                  const currentItems = automationRule.templateItems || [];
                                  const newItems = [...currentItems];
                                  
                                  // If we need more items, add them
                                  while (newItems.length < count) {
                                    newItems.push({
                                      image: '',
                                      title: '',
                                      subtitle: '',
                                      buttonText: '',
                                      buttonUrl: ''
                                    });
                                  }
                                  
                                  // If we need fewer items, remove them
                                  while (newItems.length > count) {
                                    newItems.pop();
                                  }
                                  
                                  // Update the template items
                                  const newRules = [...automationRules];
                                  newRules[index] = { ...newRules[index], templateItems: newItems };
                                  setAutomationRules(newRules);
                                }}
                                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                              />
                            </div>
                            <div className="pt-6 sm:pt-8">
                              <button
                                type="button"
                                onClick={() => {
                                  // Add a new template item
                                  const newRules = [...automationRules];
                                  const newItems = [...(newRules[index].templateItems || [])];
                                  newItems.push({
                                    image: '',
                                    title: '',
                                    subtitle: '',
                                    buttonText: '',
                                    buttonUrl: ''
                                  });
                                  
                                  // Update count and items
                                  const newCount = (newRules[index].templateCount || 1) + 1;
                                  newRules[index] = { 
                                    ...newRules[index], 
                                    templateItems: newItems,
                                    templateCount: newCount
                                  };
                                  setAutomationRules(newRules);
                                }}
                                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-pink-600 text-white rounded-md hover:bg-pink-700"
                              >
                                Add Item
                              </button>
                            </div>
                          </div>
                          
                          {(automationRule.templateItems || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="p-3 sm:p-4 border border-gray-200 rounded-lg">
                              <div className="flex justify-between items-center mb-2 sm:mb-3">
                                <h4 className="text-sm sm:text-base font-semibold">Item {itemIndex + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Remove this specific template item
                                    const newRules = [...automationRules];
                                    const newItems = [...(newRules[index].templateItems || [])].filter(
                                      (_, i) => i !== itemIndex
                                    );
                                    
                                    // Update count and items
                                    const newCount = Math.max(1, (newRules[index].templateCount || 1) - 1);
                                    newRules[index] = { 
                                      ...newRules[index], 
                                      templateItems: newItems,
                                      templateCount: newCount
                                    };
                                    setAutomationRules(newRules);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X size={isMobileView ? 16 : 18} />
                                </button>
                              </div>
                              <div className="space-y-2 sm:space-y-3">
                                <div>
                                  <label className="block text-xs sm:text-sm text-gray-700 mb-1">Image URL:</label>
                                  <input
                                    type="text"
                                    value={item.image}
                                    onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], image: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                    }}
                                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    placeholder="Enter image URL"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm text-gray-700 mb-1">Title:</label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], title: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                    }}
                                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    placeholder="Enter title"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm text-gray-700 mb-1">Subtitle:</label>
                                  <input
                                    type="text"
                                    value={item.subtitle}
                                    onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], subtitle: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                    }}
                                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    placeholder="Enter subtitle"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm text-gray-700 mb-1">Button Text:</label>
                                  <input
                                    type="text"
                                    value={item.buttonText}
                                    onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], buttonText: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                    }}
                                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    placeholder="Enter button text"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs sm:text-sm text-gray-700 mb-1">Button URL:</label>
                                  <input
                                    type="text"
                                    value={item.buttonUrl}
                                    onChange={(e) => {
                                      const newRules = [...automationRules];
                                      const newItems = [...(newRules[index].templateItems || [])];
                                      newItems[itemIndex] = { ...newItems[itemIndex], buttonUrl: e.target.value };
                                      newRules[index] = { ...newRules[index], templateItems: newItems };
                                      setAutomationRules(newRules);
                                    }}
                                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    placeholder="Enter button URL"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-pink-100">
            <button
              type="submit"
              className="w-full px-4 py-2 sm:py-2.5 bg-pink-600 text-white rounded-md text-sm sm:text-base font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
            >
              <Save size={isMobileView ? 14 : 16} />
              {editingRuleId ? 'Update Rule' : 'Save Automation Rules'}
            </button>
          </div>
        </form>

        {/* Existing Automation Rules Section */}
        <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-md p-4 sm:p-6 border border-pink-100">
          <div className="flex justify-between items-center border-b border-pink-100 pb-3 sm:pb-4 mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Your Automation Rules</h2>
            <button
              type="button"
              onClick={toggleShowRules}
              className="text-pink-600 hover:text-pink-800 text-sm sm:text-base"
            >
              {showRules ? 'Hide Rules' : 'Show Rules'}
            </button>
          </div>

          {showRules && (
          loadingRules ? (
            <div className="flex justify-center items-center py-6 sm:py-10">
              <Loader className="animate-spin text-pink-600" size={isMobileView ? 24 : 32} />
              <span className="ml-2 text-sm sm:text-base text-gray-600">Loading your automation rules...</span>
            </div>
          ) : (existingRules.length === 0) ? (
            <div className="py-6 sm:py-8 text-center">
              <p className="text-gray-500 text-sm sm:text-base">No rules found. Create your first automation rule above!</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {existingRules && existingRules.map((rule) =>(
                <div key={rule.ruleId} className={`p-3 sm:p-4 border rounded-lg hover:border-pink-200 transition-all ${
                  editingRuleId === rule.ruleId ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                }`}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 mx-auto sm:mx-0">
                        <img 
                          src={getMediaThumbnail(rule.mediaId)} 
                          alt="Post thumbnail" 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=No+Image';
                          }}
                        />
                      </div>
                      <div className="flex-grow">
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Trigger:</p>
                        <p className="text-sm sm:text-md font-medium mb-2">"{rule.triggerText}"</p>
                        
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Rule Type:</p>
                        <p className="text-sm sm:text-md capitalize mb-2">{rule.ruleType === 'template' ? 'Carousel' : 'Text'}</p>
                        
                        {rule.ruleType === 'text' && (
                          <>
                            <p className="text-xs sm:text-sm text-gray-500 mb-1">Reply:</p>
                            <p className="text-sm sm:text-md line-clamp-2">{rule.replyText}</p>
                          </>
                        )}
                        
                        {rule.ruleType === 'template' && (
                          <>
                            <p className="text-xs sm:text-sm text-gray-500 mb-1">Carousel:</p>
                            <p className="text-sm sm:text-md">{rule.templateCount || (rule as any).carouselCount || 1} items</p>
                          </>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex justify-center sm:justify-end gap-2 mt-2 sm:mt-0">
                        <button 
                          onClick={() => editRule(rule)}
                          className={`p-1.5 sm:p-2 hover:bg-blue-50 rounded-full ${
                            editingRuleId === rule.ruleId 
                              ? 'text-blue-800 bg-blue-100' 
                              : 'text-blue-600'
                          }`}
                          title="Edit rule"
                        >
                          <Edit size={isMobileView ? 16 : 18} />
                        </button>
                        <button 
                          onClick={() => rule.ruleId && deleteRule(rule.ruleId)}
                          className="p-1.5 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                          title="Delete rule"
                        >
                          <Trash2 size={isMobileView ? 16 : 18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Media Selector Modal - Made more mobile-friendly */}
      {showMediaSelector && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 w-[95%] sm:w-full max-w-3xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Select Instagram Post</h3>
              <button
                onClick={cancelMediaSelection}
                className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X size={isMobileView ? 20 : 24} />
              </button>
            </div>
            
            {mediaItems.length === 0 ? (
              <p className="text-sm sm:text-base text-gray-600 py-4">No media items found. Please reconnect your Instagram account.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
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
                      />
                    </div>
                    <div className="p-1.5 sm:p-2">
                      <p className="text-xs sm:text-sm text-gray-800 line-clamp-2">{item.caption || 'No caption'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 sm:mt-6 flex justify-end">
              <button
                onClick={cancelMediaSelection}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-xs sm:text-sm text-gray-800 rounded-md hover:bg-gray-300"
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

export default InstagramCommentAutomation;
