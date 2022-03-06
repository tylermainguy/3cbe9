from django.db import models

from . import utils
from .conversation import Conversation
from .message import Message
from .user import User


class ConversationMember(utils.CustomModel):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        db_column="conversationId",
        related_name="conversationMembers",
    )

    member = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column="member_id",
    )
