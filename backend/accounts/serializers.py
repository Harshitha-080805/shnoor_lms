from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from organizations.models import Organization
from learners.models import LearnerProfile

class RegisterSerializer(serializers.Serializer):
    email=serializers.EmailField()
    full_name=serializers.CharField(max_length=255)
    password=serializers.CharField(write_only=True)
    confirm_password=serializers.CharField(write_only=True)
    role=serializers.ChoiceField(choices=User.ROLE_CHOICES)
    learner_type=serializers.ChoiceField(choices=LearnerProfile.LEARNER_TYPES,required=False)
    organization_code=serializers.CharField(max_length=50,required=False,allow_blank=True)
    roll_number=serializers.CharField(max_length=50,required=False,allow_blank=True)
    employee_id=serializers.CharField(max_length=50,required=False,allow_blank=True)
    organization_type=serializers.ChoiceField(choices=Organization.ORGANIZATION_TYPES,required=False)
    organization_name=serializers.CharField(max_length=255,required=False)
    location=serializers.CharField(max_length=255,required=False)
    website=serializers.URLField(max_length=255,required=False,allow_blank=True,allow_null=True)

    def validate(self,data):
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email":"Email already registered"})
        if data['password']!=data['confirm_password']:
            raise serializers.ValidationError({"password":"Passwords do not match"})
        role=data['role']
        if role=='learner':
            if 'learner_type' not in data:
                raise serializers.ValidationError({"learner_type":"learner_type is required for learner role"})
            org_code=data.get('organization_code')
            if org_code:
                if not Organization.objects.filter(organization_code=org_code).exists():
                    raise serializers.ValidationError({"organization_code":"Organization with this code does not exist"})
        elif role=='organization_admin':
            required_fields=['organization_type','organization_name','organization_code','location']
            for f in required_fields:
                if not data.get(f):
                    raise serializers.ValidationError({f:f"{f} is required for organization admin"})
            org_code=data['organization_code']
            if Organization.objects.filter(organization_code=org_code).exists():
                raise serializers.ValidationError({"organization_code":"Organization code already exists"})
        return data

    def create(self,validated_data):
        role=validated_data['role']
        is_approved=True if role=='learner' else False
        user=User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            password=validated_data['password'],
            role=role,
            is_approved=is_approved
        )
        if role=='learner':
            org=None
            org_code=validated_data.get('organization_code')
            if org_code:
                org=Organization.objects.get(organization_code=org_code)
            LearnerProfile.objects.create(
                user=user,
                learner_type=validated_data['learner_type'],
                organization=org,
                roll_number=validated_data.get('roll_number',''),
                employee_id=validated_data.get('employee_id','')
            )
        elif role=='organization_admin':
            Organization.objects.create(
                name=validated_data['organization_name'],
                organization_type=validated_data['organization_type'],
                organization_code=validated_data['organization_code'],
                location=validated_data['location'],
                website=validated_data.get('website',''),
                created_by=user
            )
        return user

class LoginSerializer(serializers.Serializer):
    email=serializers.EmailField()
    password=serializers.CharField(write_only=True)

    def validate(self,data):
        email=data.get('email')
        password=data.get('password')
        if not email or not password:
            raise serializers.ValidationError("Email and password are required")
        user=authenticate(email=email,password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        if not user.is_superuser and not user.is_approved:
            raise serializers.ValidationError("Account pending admin approval")
        refresh=RefreshToken.for_user(user)
        role='admin' if user.is_superuser else user.role
        return {
            'refresh':str(refresh),
            'access':str(refresh.access_token),
            'user_id':user.id,
            'email':user.email,
            'role':role,
            'username':user.full_name,
            'full_name':user.full_name,
            'is_approved':user.is_approved
        }

class OrganizationMappingSerializer(serializers.Serializer):
    organization_code=serializers.CharField(max_length=50)

    def validate_organization_code(self,value):
        if not Organization.objects.filter(organization_code=value).exists():
            raise serializers.ValidationError("Organization with this code does not exist")
        return value

class UserSerializer(serializers.ModelSerializer):
    organization_name=serializers.SerializerMethodField()
    organization_code=serializers.SerializerMethodField()
    learner_type=serializers.SerializerMethodField()

    class Meta:
        model=User
        fields=['id','email','full_name','role','is_approved','is_active','created_at','learner_type','organization_name','organization_code']

    def get_organization_name(self,obj):
        if obj.role=='learner':
            profile=getattr(obj,'learner_profile',None)
            if profile and profile.organization:
                return profile.organization.name
        elif obj.role=='organization_admin':
            org=obj.created_organizations.first()
            if org:
                return org.name
        return None

    def get_organization_code(self,obj):
        if obj.role=='learner':
            profile=getattr(obj,'learner_profile',None)
            if profile and profile.organization:
                return profile.organization.organization_code
        elif obj.role=='organization_admin':
            org=obj.created_organizations.first()
            if org:
                return org.organization_code
        return None

    def get_learner_type(self,obj):
        if obj.role=='learner':
            profile=getattr(obj,'learner_profile',None)
            if profile:
                return profile.learner_type
        return None
