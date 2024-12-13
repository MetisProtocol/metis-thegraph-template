import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/db';

// import { GetUserSchema, UserSchema } from "@/api/user/userModel";
// import { validateRequest } from "@/common/utils/validateRequest";

const userRouter = express.Router();

userRouter.post('/signup', async (req, res) => {
    const { name, email, posts } = req.body;

    const postData = posts?.map((post: Prisma.PostCreateInput) => {
        return { title: post?.title, content: post?.content };
    });

    const result = await prisma.user.create({
        data: {
            name,
            email,
            posts: {
                create: postData,
            },
        },
    });
    res.json(result);
});

userRouter.post(`/post`, async (req, res) => {
    const { title, content, authorEmail } = req.body;
    const result = await prisma.post.create({
        data: {
            title,
            content,
            author: { connect: { email: authorEmail } },
        },
    });
    res.json(result);
});

userRouter.get(`/post/:id`, async (req, res) => {
    const { id }: { id?: string } = req.params;

    const post = await prisma.post.findUnique({
        where: { id: Number(id) },
    });
    res.json(post);
});

userRouter.get('/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

userRouter.get('/posts', async (req, res) => {
    const posts = await prisma.post.findMany();
    res.json(posts);
});

export { userRouter };
