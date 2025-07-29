import React, { useState, useEffect } from 'react';
import { Bell, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface PriceNotification {
  id: string;
  itemId: string;
  itemName: string;
  itemType: 'flight' | 'service';
  oldPrice: number;
  newPrice: number;
  timestamp: Date;
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
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const handleNotificationClick = (notification: PriceNotification) => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-accent"
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Price Notifications</CardTitle>
              {notifications.length > 0 && (
                <div className="flex gap-2">
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
            </div>
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
            <ScrollArea className="max-h-96">
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
                          "p-2 rounded-full",
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
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
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
  );
}