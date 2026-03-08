import React from 'react';
import { Event, EventCategory, FlightDetails, AccommodationDetails, TransportDetails, ActivityDetails, ShoppingDetails, GeneralDetails } from '@/types';
import { CATEGORY_ICONS, CURRENCY_SYMBOLS, PRESET_TAGS } from '@/constants';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Share2, ExternalLink, MapPin, Star, Heart } from 'lucide-react';

interface EventCardProps {
  event: Event;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onToggleFavorite?: () => void;
}

const renderDetails = (category: EventCategory, details: Event['details']) => {
  switch (category) {
    case EventCategory.Flights: {
      const flight = details as FlightDetails;
      return (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {flight.airline && `${flight.airline} · `}{flight.dept_airport} → {flight.arr_airport} {flight.flight_num && `(${flight.flight_num})`}
          </p>
          {(flight.terminal || flight.gate) && (
            <p className="text-xs text-muted-foreground">
              {flight.terminal && `Terminal ${flight.terminal}`}{flight.terminal && flight.gate && ' · '}{flight.gate && `Gate ${flight.gate}`}
            </p>
          )}
          {flight.confirmation_num && <p className="text-xs text-muted-foreground">📋 {flight.confirmation_num}</p>}
          {flight.checkin_link && (
            <a href={flight.checkin_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3 mr-1" /> Check-in
            </a>
          )}
        </div>
      );
    }
    case EventCategory.Accommodation: {
      const accommodation = details as AccommodationDetails;
      return (
        <div className="space-y-0.5">
          {accommodation.address && <p className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3 w-3 mr-1 flex-shrink-0" />{accommodation.address}</p>}
          {accommodation.room_type && <p className="text-xs text-muted-foreground">🛏️ {accommodation.room_type}</p>}
          {accommodation.confirmation_num && <p className="text-xs text-muted-foreground">📋 {accommodation.confirmation_num}</p>}
          {accommodation.book_link && (
            <a href={accommodation.book_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3 mr-1" /> View Booking
            </a>
          )}
        </div>
      );
    }
    case EventCategory.Transport: {
      const transport = details as TransportDetails;
      const typeLabels: Record<string, string> = { rental: '🚗 Rental', train: '🚆 Train', bus: '🚌 Bus', taxi: '🚕 Taxi', ferry: '⛴️ Ferry', other: '📦 Other' };
      return (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {transport.transport_type && `${typeLabels[transport.transport_type] || transport.transport_type} · `}
            {transport.pickup_point} → {transport.dropoff_point}
          </p>
          {transport.company && <p className="text-xs text-muted-foreground">🏢 {transport.company}</p>}
          {transport.confirmation_num && <p className="text-xs text-muted-foreground">📋 {transport.confirmation_num}</p>}
          {transport.book_link && (
            <a href={transport.book_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3 mr-1" /> Booking
            </a>
          )}
        </div>
      );
    }
    case EventCategory.Activity: {
      const activity = details as ActivityDetails;
      return (
        <div className="space-y-0.5">
          {(activity.address || activity.location) && <p className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3 w-3 mr-1 flex-shrink-0" />{activity.address || activity.location}</p>}
          {activity.opening_hours && <p className="text-xs text-muted-foreground">🕐 {activity.opening_hours}</p>}
          {activity.confirmation_num && <p className="text-xs text-muted-foreground">📋 {activity.confirmation_num}</p>}
          {activity.book_link && (
            <a href={activity.book_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3 mr-1" /> Booking
            </a>
          )}
        </div>
      );
    }
    case EventCategory.Shopping: {
      const shopping = details as ShoppingDetails;
      return (
        <div className="space-y-0.5">
          {shopping.address && <p className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3 w-3 mr-1 flex-shrink-0" />{shopping.address}</p>}
          {shopping.opening_hours && <p className="text-xs text-muted-foreground">🕐 {shopping.opening_hours}</p>}
          {shopping.customs_note && <p className="text-xs text-muted-foreground">📦 {shopping.customs_note}</p>}
          {shopping.website && (
            <a href={shopping.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center text-xs text-primary hover:underline">
              <ExternalLink className="h-3 w-3 mr-1" /> Website
            </a>
          )}
        </div>
      );
    }
    default: {
      const general = details as GeneralDetails;
      return general?.location ? <p className="text-xs text-muted-foreground flex items-center"><MapPin className="h-3 w-3 mr-1 flex-shrink-0" />{general.location}</p> : null;
    }
  }
};

const getTagStyle = (tag: string) => {
  const preset = PRESET_TAGS.find(t => t.label === tag);
  if (preset) return preset.color;
  return 'bg-secondary text-muted-foreground border-border';
};

const getTagEmoji = (tag: string) => {
  const preset = PRESET_TAGS.find(t => t.label === tag);
  return preset?.emoji || '🏷️';
};

const EventCard: React.FC<EventCardProps> = ({ event, onEdit, onDelete, onShare, onToggleFavorite }) => {
  const categoryIcon = CATEGORY_ICONS[event.category] || '📌';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative card-surface p-3 transition-all ${isDragging ? 'opacity-50 scale-105 shadow-xl ring-2 ring-primary/20' : 'hover:shadow-md hover:border-primary/30'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-grow">
          <div {...attributes} {...listeners} className="ml-2 mt-2 p-1 text-muted-foreground/40 cursor-grab active:cursor-grabbing hover:text-muted-foreground transition-colors">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex items-start cursor-pointer flex-grow" onClick={onEdit} role="button" tabIndex={0} aria-label={`ערוך: ${event.title}`}>
            <div className="text-lg ml-3 mt-0.5 flex-shrink-0 w-9 h-9 flex items-center justify-center bg-secondary rounded-lg">
              {categoryIcon.replace('️', '')}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{event.time}{event.endTime ? ` - ${event.endTime}` : ''}</span>
                {event.amount > 0 && (
                  <span className="text-xs font-semibold text-accent">
                    {event.amount.toLocaleString()} {CURRENCY_SYMBOLS[event.currency] || event.currency}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-card-foreground leading-tight">{event.title}</h3>
              <div className="mt-0.5">{renderDetails(event.category, event.details)}</div>
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {event.tags.map(tag => (
                    <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getTagStyle(tag)}`}>
                      {getTagEmoji(tag)} {tag}
                    </span>
                  ))}
                </div>
              )}
              {event.rating && event.rating > 0 && (
                <div className="flex items-center mt-1">
                  {Array.from({ length: event.rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                </div>
              )}
              {event.notes && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">📝 {event.notes}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0 mr-2">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={`p-1.5 transition-colors ${event.is_favorite ? 'text-red-500' : 'sm:opacity-0 sm:group-hover:opacity-100 btn-ghost'}`}
              title={event.is_favorite ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
            >
              <Heart className={`h-3.5 w-3.5 ${event.is_favorite ? 'fill-red-500' : ''}`} />
            </button>
          )}
          <div className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="btn-ghost p-1.5" title="Share"><Share2 className="h-3.5 w-3.5" /></button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="btn-ghost p-1.5" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="btn-ghost p-1.5 hover:text-destructive" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCard;