from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from models import TicketStatus, TicketPriority, SenderType

# --- Replies ---
class TicketReplyBase(BaseModel):
    message: str
    sender_type: SenderType

class TicketReplyCreate(TicketReplyBase):
    pass

class TicketReply(TicketReplyBase):
    id: int
    ticket_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Tickets ---
class TicketBase(BaseModel):
    sender_email: str
    subject: str
    content: str
    priority: Optional[TicketPriority] = TicketPriority.MEDIUM

class TicketCreate(TicketBase):
    pass

class TicketUpdateStatus(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None

class Ticket(TicketBase):
    id: int
    ticket_no: str
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TicketWithReplies(Ticket):
    replies: List[TicketReply] = []
