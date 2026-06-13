from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

import models
import schemas
from database import engine, get_db

# DB 초기화: 테이블 생성 (it_support.db 자동 생성)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="IT Support Ticket API")

def generate_ticket_no(db: Session) -> str:
    now = datetime.utcnow()
    prefix = f"T{now.strftime('%Y%m')}-"
    
    # 해당 월의 마지막 티켓 번호 조회
    last_ticket = db.query(models.Ticket).filter(models.Ticket.ticket_no.like(f"{prefix}%")).order_by(models.Ticket.id.desc()).first()
    
    if last_ticket:
        last_seq = int(last_ticket.ticket_no.split('-')[1])
        new_seq = last_seq + 1
    else:
        new_seq = 1
        
    return f"{prefix}{new_seq:04d}"

@app.get("/api/tickets", response_model=List[schemas.Ticket])
def read_tickets(status: Optional[models.TicketStatus] = Query(None, description="Filter by ticket status"), db: Session = Depends(get_db)):
    query = db.query(models.Ticket)
    if status:
        query = query.filter(models.Ticket.status == status)
    return query.all()

@app.get("/api/tickets/{ticket_id}", response_model=schemas.TicketWithReplies)
def read_ticket(ticket_id: int, db: Session = Depends(get_db)):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return db_ticket

@app.put("/api/tickets/{ticket_id}/status", response_model=schemas.Ticket)
def update_ticket_status(ticket_id: int, ticket_update: schemas.TicketUpdateStatus, db: Session = Depends(get_db)):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket_update.status is not None:
        db_ticket.status = ticket_update.status
    if ticket_update.priority is not None:
        db_ticket.priority = ticket_update.priority
        
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@app.post("/api/tickets/{ticket_id}/replies", response_model=schemas.TicketReply, status_code=201)
def create_ticket_reply(ticket_id: int, reply: schemas.TicketReplyCreate, db: Session = Depends(get_db)):
    db_ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    db_reply = models.TicketReply(
        ticket_id=ticket_id,
        sender_type=reply.sender_type,
        message=reply.message
    )
    db.add(db_reply)
    db.commit()
    db.refresh(db_reply)
    return db_reply

# 테스트용 티켓 생성 API (요구사항 외 추가 기능)
@app.post("/api/tickets", response_model=schemas.Ticket, status_code=201)
def create_ticket(ticket: schemas.TicketCreate, db: Session = Depends(get_db)):
    ticket_no = generate_ticket_no(db)
    db_ticket = models.Ticket(
        ticket_no=ticket_no,
        sender_email=ticket.sender_email,
        subject=ticket.subject,
        content=ticket.content,
        priority=ticket.priority
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket
