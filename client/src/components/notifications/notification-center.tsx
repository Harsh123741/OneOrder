import React, { useState, useEffect } from 'react';
import { Bell, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface PriceNotification {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'flight' | 'service';
  oldPrice: number;
  newPrice: number;
  timestamp: Date | string;
  isRead: boolean;
  trend: 'up' | 'down';
  fareHoldStatus?: 'protected' | 'live';
}

interface NotificationCenterProps {
  notifications: PriceNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLatestPreview, setShowLatestPreview] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const latestNotification = notifications.find(n => !n.isRead) || notifications[0];

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  
  const formatTimestamp = (timestamp: Date | string) => {
    const now = new Date();
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: PriceNotification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  // Show latest notification preview on hover if there are unread notifications
  useEffect(() => {
    if (unreadCount > 0 && !isOpen) {
      const timer = setTimeout(() => setShowLatestPreview(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowLatestPreview(false);
    }
  }, [unreadCount, isOpen]);

  return (
    <div className="relative">
      {/* Latest Notification Preview */}
      {showLatestPreview && latestNotification && !isOpen && (
        <div className="absolute top-12 right-0 z-50 w-80 animate-in slide-in-from-top-2">
          <Card className="border shadow-lg bg-background">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-1.5 rounded-full flex-shrink-0",
                  latestNotification.trend === 'up' 
                    ? "bg-red-100 dark:bg-red-950/30" 
                    : "bg-green-100 dark:bg-green-950/30"
                )}>
                  {latestNotification.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-red-600 dark:text-red-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-600 dark:text-green-400" />
                  )}
                </div>
                
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-sm">{latestNotification.itemName}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {formatPrice(latestNotification.oldPrice)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className={cn(
                      "font-medium",
                      latestNotification.trend === 'up' 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-green-600 dark:text-green-400"
                    )}>
                      {formatPrice(latestNotification.newPrice)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {latestNotification.itemType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(latestNotification.timestamp)}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowLatestPreview(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-accent"
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            onMouseEnter={() => unreadCount > 0 && setShowLatestPreview(true)}
            onMouseLeave={() => setShowLatestPreview(false)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Price Notifications</CardTitle>
              {notifications.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onMarkAllAsRead}
                      className="text-xs"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    className="text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardHeader>
          
            {notifications.length === 0 ? (
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No price notifications yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add items to your cart to track price changes
                </p>
              </CardContent>
            ) : (
              <ScrollArea className="h-96">
                <CardContent className="p-0">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={cn(
                          "p-4 cursor-pointer transition-colors hover:bg-accent/50",
                          !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-full flex-shrink-0",
                            notification.trend === 'up' 
                              ? "bg-red-100 dark:bg-red-950/30" 
                              : "bg-green-100 dark:bg-green-950/30"
                          )}>
                            {notification.trend === 'up' ? (
                              <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{notification.itemName}</p>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">
                                {formatPrice(notification.oldPrice)}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className={cn(
                                "font-medium",
                                notification.trend === 'up' 
                                  ? "text-red-600 dark:text-red-400" 
                                  : "text-green-600 dark:text-green-400"
                              )}>
                                {formatPrice(notification.newPrice)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {notification.itemType}
                                </Badge>
                                {notification.fareHoldStatus && (
                                  <Badge 
                                    variant={notification.fareHoldStatus === 'protected' ? 'default' : 'outline'}
                                    className="text-xs"
                                  >
                                    {notification.fareHoldStatus === 'protected' ? '🔒 Protected' : '📈 Live'}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </ScrollArea>
            )}
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}