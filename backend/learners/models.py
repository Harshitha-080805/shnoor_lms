from django.db import models

class LearnerProfile(models.Model):
    LEARNER_TYPES=(
        ('independent','Independent Learner'),
        ('student','Student'),
        ('employee','Employee'),
    )
    user=models.OneToOneField('accounts.User',on_delete=models.CASCADE,related_name='learner_profile')
    learner_type=models.CharField(max_length=20,choices=LEARNER_TYPES,default='independent')
    organization=models.ForeignKey('organizations.Organization',on_delete=models.SET_NULL,null=True,blank=True,related_name='learners')
    roll_number=models.CharField(max_length=50,blank=True,null=True)
    employee_id=models.CharField(max_length=50,blank=True,null=True)
    created_at=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.learner_type}"
