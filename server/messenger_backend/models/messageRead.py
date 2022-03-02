from django.db import models

from . import utils
from .conversation import Conversation
from .message import Message


class MessageRead(utils.CustomModel):
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, db_column="messageId", related_name="+"
    )

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        db_column="conversationId",
        related_name="messagesRead",
    )

    recipientId = models.IntegerField(null=False)
    hasBeenRead = models.BooleanField(null=False, default=False)
    updatedAt = models.DateTimeField(auto_now=True)
