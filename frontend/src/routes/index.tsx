import { queryOptions, useQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import axios from 'redaxios';

type PostType = {
  id: string;
  title: string;
  body: string;
};

const fetchPosts = async () => {
  console.info('Fetching posts...');
  await new Promise((r) => setTimeout(r, 500));
  return axios.get<Array<PostType>>('https://jsonplaceholder.typicode.com/posts').then((r) => r.data.slice(0, 10));
};

const postsQueryOptions = queryOptions({
  queryKey: ['posts'],
  queryFn: () => fetchPosts(),
});

export const Route = createFileRoute('/')({
  component: Index,
});
function Index() {
  const { data, error, isPending } = useQuery(postsQueryOptions);
  const posts = data || [];

  if (isPending) return <div>Loading...</div>;

  if (error) return <div>Errorjfgnjng: {error.message}</div>;

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>

      <div className="p-2 flex gap-2">
        <ul className="list-disc pl-4">
          {[...posts, { id: 'i-do-not-exist', title: 'Non-existent Post' }].map((post) => {
            return (
              <li key={post.id} className="whitespace-nowrap">
                <div>{post.title.substring(0, 20)}</div>
              </li>
            );
          })}
        </ul>
        <hr />
        <Outlet />
      </div>
    </div>
  );
}
